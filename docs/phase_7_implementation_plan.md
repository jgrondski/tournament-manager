# Phase 7 Implementation Plan: Relational Persistence & Avatar System

## 1. Executive Summary & Strategy
Phase 7 migrates `tournament-manager` from ephemeral client-side LocalStorage state to a persistent relational database using Neon Serverless PostgreSQL and Drizzle ORM, with Cloudflare R2 for custom avatar asset storage.

**Clean-Slate Policy:** All prior LocalStorage test data and mock fixtures are discarded. No legacy migration scripts, data-backfill adapters, or dual-write layers will be built. The database initializes in a clean, empty state.

---

## 2. Architecture & Tech Stack

* **Database:** PostgreSQL (Neon Serverless in cloud; local Docker PostgreSQL for offline LAN setups).
* **ORM & Migrations:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
* **Connection Client:** `@neondatabase/serverless` (or `pg` pool for standard Postgres).
* **Asset Storage:** Cloudflare R2 (S3-compatible) for custom avatars and thumbnails.
* **Identifiers:** Universally unique identifiers (UUID v4) across all entities to support local-to-cloud sync with zero ID collisions.

---

## 3. Schema Definitions (`/src/db/schema.ts`)

### 3.1 Global Player Pool
```typescript
import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  country: text('country'), // ISO code or country identifier for flag rendering
  avatarType: text('avatar_type', { enum: ['flag', 'custom'] }).notNull().default('flag'),
  avatarUrl: text('avatar_url'),
  avatarThumbnailUrl: text('avatar_thumbnail_url'),
  personalBest: integer('personal_best').default(0).notNull(),
  playstyle: text('playstyle'), // e.g., 'DAS', 'Rolling', 'Hypertap'
  notes: text('notes'),
  isDisqualified: boolean('is_disqualified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameLowerIdx: uniqueIndex('players_name_lower_idx').on(sql`lower(trim(${table.name}))`),
}));
```

### 3.2 Tournaments & Bracket Tiers
```typescript
import { pgTable, uuid, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  qualFormat: text('qual_format', { enum: ['HIGH_SCORE', 'AVERAGE_OF_X', 'POINTS'] }).notNull(),
  qualAverageCount: integer('qual_average_count'),
  pointsConfig: jsonb('points_config').$type<Array<{ minScore: number number; points: }>>(),
  qualsClosed: boolean('quals_closed').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bracketTiers = pgTable('bracket_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  priorityOrder: integer('priority_order').notNull(), // 1 = highest tier
  name: text('name').notNull(), // e.g., "Gold", "Silver"
  bracketType: text('bracket_type', { enum: ['TRADITIONAL', 'FLAT'] }).notNull(),
  flatWidth: integer('flat_width'),
  numPlayers: integer('num_players').notNull(),
  primaryColor: text('primary_color').notNull().default('#FFD700'),
  secondaryColor: text('secondary_color').notNull().default('#000000'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 3.3 Roster & Qualifier Ingestion
```typescript
import { pgTable, uuid, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tournaments, bracketTiers, players } from './schema';

export const tournamentPlayers = pgTable('tournament_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'restrict' }).notNull(),
  tierId: uuid('tier_id').references(() => bracketTiers.id, { onDelete: 'set null' }),
  seed: integer('seed'), // Tier-relative seed (1..N)
  qualsCompleted: boolean('quals_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const qualifierSubmissions = pgTable('qualifier_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  playerId: uuid('player_id').references(() => players.id, { onDelete: 'restrict' }).notNull(),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 3.4 Matches & Games
```typescript
import { pgTable, uuid, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { bracketTiers, players } from './schema';

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tierId: uuid('tier_id').references(() => bracketTiers.id, { onDelete: 'cascade' }).notNull(),
  roundNumber: integer('round_number').notNull(),
  player1Id: uuid('player1_id').references(() => players.id, { onDelete: 'set null' }),
  player2Id: uuid('player2_id').references(() => players.id, { onDelete: 'set null' }),
  winnerId: uuid('winner_id').references(() => players.id, { onDelete: 'set null' }),
  loserId: uuid('loser_id').references(() => players.id, { onDelete: 'set null' }),
  bestOf: integer('best_of').notNull().default(3),
  isForfeit: boolean('is_forfeit').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  player1Idx: index('matches_player1_idx').on(table.player1Id),
  player2Idx: index('matches_player2_idx').on(table.player2Id),
}));

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  gameNumber: integer('game_number').notNull(),
  player1Score: integer('player1_score').notNull().default(0),
  player2Score: integer('player2_score').notNull().default(0),
  winnerId: uuid('winner_id').references(() => players.id, { onDelete: 'set null' }),
  loserId: uuid('loser_id').references(() => players.id, { onDelete: 'set null' }),
  isIntentionalTopout: boolean('is_intentional_topout').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 4. Implementation Steps

### Step 1: Database Scaffolding
1. Install Drizzle dependencies:
   ```bash
   npm install drizzle-orm @neondatabase/serverless
   npm install -D drizzle-kit
   ```
2. Configure `drizzle.config.ts`:
   * Schema location: `./src/db/schema.ts`.
   * Output directory: `./drizzle`.
   * Dialect: `postgresql`.
3. Add `DATABASE_URL` to local `.env`.
4. Run `npx drizzle-kit push` to apply schemas directly to the target database.

### Step 2: Serverless API Routes & Data Layer
Create type-safe server handlers under `/api/*` (or Next.js/Vite server middleware):
* `/api/tournaments` – CRUD operations for tournament setup and tier definitions.
* `/api/players` – Player directory management (name, country, avatar, personal best, notes).
* `/api/qualifiers` – Submission ingestion and real-time leaderboard aggregation.
* `/api/brackets` – Bracket snapshot generation on verification, match feeds, and score drawer writes.

### Step 3: Avatar Ingestion Pipeline (Cloudflare R2)
1. Install AWS S3 client:
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```
2. **Client-side Compression Utility (`/src/utils/image.ts`):**
   * Takes a raw image `File`.
   * Draws to HTML5 `<canvas>` to export two WebP data blobs:
     * Full Avatar: max 256×256 px (~30 KB).
     * Thumbnail: 32×32 px (~3 KB).
3. **Presigned Upload Route (`/api/uploads/presigned-url`):**
   * Accepts `{ playerId: string, extension: string }`.
   * Issues two signed PUT URLs for R2 keys: `avatars/${id}.webp` and `thumbnails/${id}.webp`.
4. **Player Avatar Component (`/src/components/PlayerAvatar.tsx`):**
   * If `avatarType === 'custom'` and `avatarUrl` exists: Renders `<img src={avatarUrl} />`.
   * Fallback / `avatarType === 'flag'`: Renders country flag badge or generic fallback icon.

### Step 4: UI Hook Refactoring
Replace existing LocalStorage store hooks with query hooks (React Query, SWR, or standard `useEffect` fetch):
* Replace `useLocalStorage('tournaments')` with `useTournaments()`.
* Replace `useLocalStorage('qualifiers')` with `useQualifiers(tournamentId)`.
* Replace `useLocalStorage('matches')` with `useMatches(tierId)`.

### Step 5: Verification & Integrity Tests
1. Verify `lower(trim(name))` constraint rejects duplicate player names.
2. Confirm cascading deletes: deleting a tournament cleanly drops tiers, matches, and qualifiers without leaving orphaned records.
3. Confirm unverified brackets accept no match scores.
4. Verify dynamic career stats query execution time against seeded test matches.