# Avatar System & Phase 7 DB Schema Sketch

## 1. Avatar Data Model

### PlayerProfile Changes (types.ts)

```typescript
export type AvatarType = 'flag' | 'custom';

export interface PlayerProfile {
  id: string;
  name: string;
  country?: string;           // kept for data/filtering, NOT just display
  avatarType: AvatarType;     // 'flag' = derive from country, 'custom' = use avatarUrl
  avatarUrl?: string;         // uploaded image URL (S3/R2/Supabase Storage)
  avatarThumbnailUrl?: string; // optional pre-resized small version (24-32px)
  personalBest: number;
  playstyle: Playstyle;
  notes?: string;
  isDisqualified?: boolean;
}
```

**Key decisions:**
- `country` stays as a first-class data field (org stats, filtering, leaderboards still use it)
- `avatarType: 'flag'` means "render the country emoji" — zero migration needed for existing players
- `avatarType: 'custom'` means "render `avatarUrl` as an `<img>`"
- Default is `'flag'` so every existing player works without changes

---

### New Generic Component: `<PlayerAvatar />`

Replaces all `CountryFlag` call sites with a single drop-in:

```typescript
// src/features/players/components/PlayerAvatar.tsx
interface PlayerAvatarProps {
  player: Pick<PlayerProfile, 'avatarType' | 'avatarUrl' | 'country' | 'name'>;
  size?: number;        // px, default 20
  showCountry?: boolean; // show country name text alongside
  className?: string;
  style?: React.CSSProperties;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, size = 20 }) => {
  if (player.avatarType === 'custom' && player.avatarUrl) {
    return <img src={player.avatarUrl} alt={player.name} style={{
      width: size, height: size, borderRadius: '50%', objectFit: 'cover'
    }} />;
  }
  // Fallback: country flag emoji (existing behavior)
  return <CountryFlag country={player.country} />;
};
```

**Migration path:** Global find-replace `<CountryFlag country={item.country}` with `<PlayerAvatar player={item}` across 14 files. Mechanical, ~30 min.

---

## 2. Phase 7 DB Schema (Drizzle/PostgreSQL)

### Tables

```sql
-- Organizations
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  logo_url      TEXT,
  website_url   TEXT,
  discord_url   TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Global Players (cross-tournament identity)
CREATE TABLE players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  country             TEXT,              -- ISO 2-letter code
  avatar_type         TEXT DEFAULT 'flag' CHECK (avatar_type IN ('flag', 'custom')),
  avatar_url          TEXT,              -- S3/R2 URL for custom avatars
  avatar_thumbnail_url TEXT,
  playstyle           TEXT CHECK (playstyle IN ('DAS', 'Hypertap', 'Rolling', 'Hybrid')),
  personal_best       INTEGER DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Tournaments
CREATE TABLE tournaments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  date              DATE,
  location          TEXT,
  seeding_method    TEXT DEFAULT 'QUALIFIERS'
                    CHECK (seeding_method IN ('QUALIFIERS', 'MANUAL')),
  qual_format       TEXT CHECK (qual_format IN ('HIGH_SCORE', 'AVERAGE_OF_X', 'POINTS')),
  qual_average_count INTEGER DEFAULT 2,
  is_locked         BOOLEAN DEFAULT false,
  manual_seeds      UUID[],            -- ordered array of player IDs (MANUAL seeding)
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Tournament-Player enrollment (per-tournament overrides)
CREATE TABLE tournament_players (
  tournament_id     UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id         UUID REFERENCES players(id),
  is_disqualified   BOOLEAN DEFAULT false,
  quals_completed   BOOLEAN DEFAULT false,
  is_verified       BOOLEAN DEFAULT false,
  PRIMARY KEY (tournament_id, player_id)
);

-- Bracket Tiers
CREATE TABLE tiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  priority          INTEGER NOT NULL,
  player_count      INTEGER NOT NULL,
  bracket_type      TEXT CHECK (bracket_type IN ('TRADITIONAL', 'FLAT')),
  elimination_type  TEXT CHECK (elimination_type IN ('SINGLE', 'DOUBLE')),
  bracket_routing   TEXT,               -- 'ACCELERATED_HYBRID' etc.
  flat_width        INTEGER,
  finals_cutoff     INTEGER,
  best_of           INTEGER DEFAULT 5,
  is_locked         BOOLEAN DEFAULT false,
  -- Theme colors
  primary_color     TEXT,
  secondary_color   TEXT,
  card_color        TEXT,
  text_color        TEXT,
  background_color  TEXT,
  -- Bracket state (JSONB — mirrors current in-memory structure)
  bracket_data      JSONB,
  UNIQUE (tournament_id, slug)
);

-- Qualifier Submissions
CREATE TABLE qualifier_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id       UUID REFERENCES players(id),
  score           INTEGER NOT NULL,
  submitted_at    TIMESTAMPTZ DEFAULT now()
);

-- Match Scores
CREATE TABLE match_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  tier_id           UUID REFERENCES tiers(id) ON DELETE CASCADE,
  match_id          TEXT NOT NULL,       -- bracket-internal match ID
  is_complete       BOOLEAN DEFAULT false,
  winner_player_id  UUID REFERENCES players(id),
  games             JSONB,              -- array of GameScoreEntry
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  UNIQUE (tournament_id, tier_id, match_id)
);
```

---

## 3. File Storage Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Supabase Storage** | Integrated with Postgres, free tier, CDN | Vendor lock-in |
| **Cloudflare R2** | No egress fees, S3-compatible | Separate service |
| **Vercel Blob** | Zero-config with Vercel deploy | 250MB free tier |

**Recommendation:** Vercel Blob if deploying to Vercel (simplest), R2 if you want flexibility.

Upload flow:
1. Client requests presigned URL from API endpoint
2. Client uploads directly to storage
3. API stores returned URL in `players.avatar_url`
4. Optional: resize to 64x64 thumbnail on upload via edge function

---

## 4. LocalStorage to DB Migration

One-time import path:
1. Read `tm_tournaments_v2`, `tm_global_players`, etc. from localStorage
2. POST to `/api/migrate` endpoint that bulk-inserts into Postgres
3. Clear localStorage keys after confirmed success
4. App checks DB first, falls back to localStorage during transition

---

## 5. Codebase Refactor Surface for Avatar

Files that import `CountryFlag` today (mechanical replacement):

| # | File | Context |
|---|------|---------|
| 1 | `ManualSeedingManager.tsx` | Seeding table rows |
| 2 | `DualListSeedingModal.tsx` | Shuttle list items |
| 3 | `LeaderboardTable.tsx` | Qualifier rankings |
| 4 | `FinalStandingsTable.tsx` | Final standings rows |
| 5 | `BracketMatchCard.tsx` | Bracket visualizer player slots |
| 6 | `BracketChampionNode.tsx` | Champion display |
| 7 | `SheetMatchRow.tsx` | Organizer sheet rows |
| 8 | `MatchCardFeed.tsx` | Live match feed |
| 9 | `MatchTelemetryModal.tsx` | Match detail modal |
| 10 | `MatchupBanner.tsx` | Score drawer header |
| 11 | `PlayerDetailDrawer.tsx` | Player detail panel |
| 12 | `PlayerDirectory.tsx` | Global player list |
| 13 | `PlayerEditModal.tsx` | Player edit form (add upload UI here) |
| 14 | `ManageTournamentPlayersPage.tsx` | Tournament roster |

All are `<CountryFlag country={x.country} />` to `<PlayerAvatar player={x} />`. The `PlayerEditModal` additionally gets an upload widget.

---

## 6. Suggested Phase Ordering

| Step | What | When |
|------|------|------|
| **7a** | DB schema design (bake avatar fields in from day 1) | First |
| **7b** | Drizzle ORM setup, Neon connection, API routes | Second |
| **7c** | LocalStorage to DB migration path | Third |
| **7d** | `PlayerAvatar` component + 14-file refactor | During or after 7b |
| **7e** | Avatar upload UI in PlayerEditModal + storage endpoint | After 7b |
| **7f** | RBAC foundation (manage vs spectator auth) | Last in Phase 7 |
