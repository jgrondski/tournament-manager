# SPEC.md: Tournament Manager

## 1. Project Overview
A web-based bracket and leaderboard manager built for competitive gaming tournaments. The application provides real-time reactive updates, CTWC-style retro OBS overlays, customizable qualifying formats (High Score, Average of X, Points), flat and traditional bracket routing, and mobile-responsive match recording for floor judges.

The system prioritizes human readability, minimal runtime overhead, and zero over-engineered dead code for rare edge cases.

---

## 2. Project Status & Roadmap

* **Phase 1: Core Routing Engine (Complete)**
  * Pure mathematical functions for traditional single-elimination and flat brackets. Strict bye invariant enforced (no phantom match entities; players advance directly to their calculated entry round; total matches strictly equals N - 1).
* **Phase 2: Reactive UI & Match Recording (Complete)**
  * Visual bracket tree, mobile-responsive match card feed, and drawer-based score submission. Multi-game score tracking, dynamic match win derivations, forfeit flags, and Best-of-X overrides.
* **Phase 3: Unified In-Memory Pipeline (Active Goal)**
  * Eliminate hardcoded mock data fixtures. Wire the end-to-end pipeline in browser state (LocalStorage): Admin Tournament/Tier configuration -> Live Qualifier score submission -> Dynamic Leaderboard -> Tier-relative Seeding -> "Verify Brackets" snapshot.
* **Phase 4: Relational Persistence (Upcoming)**
  * Translate finalized TypeScript data contracts into Neon serverless PostgreSQL tables via Drizzle ORM schemas and server functions.
* **Phase 5: Production Deployment, OBS Overlays & Polish (Upcoming)**
  * Vercel edge deployment, PIN security on /manage/* routes, full-bleed 16:9 /obs/* browser sources, and SVG bracket connector lines.

---

## 3. Directory Structure (Strict Feature-Driven)
* /src/features/bracket/ – Bracket trees, mathematical routing, node state, match drawers.
* /src/features/qualifiers/ – Score submission, dynamic leaderboard sorting, tier cutoff assignments.
* /src/features/tournament/ – Admin setup forms, tier configuration (priority order, width, cutoffs).
* /src/features/players/ – Global player pool directory and tournament roster registration.
* /src/routes/ – Top-level page routes (/manage/*, /obs/*).
* /src/components/ – Shared UI components (inputs, modals, buttons, table wrappers).

---

## 4. Universal Invariants & State Rules

### 4.1 Bye Handling & Match Invariant
* Total playable Match records generated per tier must equal exactly:
  total_matches = N - 1
* Byes are never represented as playable matches and never accept scores.
* Players receiving byes are placed directly into their calculated entry round:
  entry_round = total_byes_for_seed + 1
* Any node awaiting a feeder or bye recipient initializes with player2_id: null. Matches appear in score entry interfaces only when both competitors are confirmed.

### 4.2 Tier-Relative Seeding
* Leaderboard ranks must be normalized relative to the tier before passing to the bracket generator:
  tier_seed = global_rank - tier_start_rank + 1
* Example: In a 12-player Silver tier composed of leaderboard ranks 13 through 24, Rank 13 becomes Seed 1, Rank 14 becomes Seed 2, through Rank 24 becoming Seed 12.

### 4.3 Tie Handling (Zero Dead Code)
* Ties are broken arbitrarily and deterministically via earlier submission timestamp or player ID.
* No dedicated tiebreaker modals, blocking UI states, or automated tie-resolution flags. Organizers manually edit scores if a tie adjustment is required.

### 4.4 Personal Best (PB) Updates
* Player.pb is strictly a manual field edited via the player management form. Match and qualifier scores must never auto-mutate this value.

### 4.5 Bracket Verification Lifecycle
1. **DRAFT:** Brackets dynamically preview seeding changes as qualifier scores arrive. Match score entry is strictly disabled in DRAFT state. A prominent amber banner displays across all bracket, sheet, and match feed views: *"DRAFT SEEDING PREVIEW — Qualifiers Active. Click 'Verify Brackets' to lock seeds and begin match play."*
2. **VERIFY BRACKETS:** A double-confirmation modal freezes seeds and instantiates static match records. Late qualifier edits update qualifier records but do not alter verified bracket match pairings.
3. **UNLOCK BRACKETS:** A double-confirmation action reverting the bracket to DRAFT.
   * Safety Invariant: "Unlock Brackets" is blocked if any match in the tournament contains recorded game scores. The UI displays: "Cannot unlock: Match play has begun. Clear recorded scores before unlocking."

---

## 5. Phase 3 Specifications: Unified In-Memory Pipeline

### 5.1 Admin Tournament & Tier Setup (/src/features/tournament)
* **Tournament Form:**
  * Tournament Name.
  * Slug: Human-readable URL slug automatically derived from name (e.g., "KC Regional 2026 Open" -> "kc-2026-open"), with optional manual edit.
  * Qualifying Format: HIGH_SCORE, AVERAGE_OF_X, or POINTS.
  * Format Config: Target count X for average mode; array of { min_score: number, points: number } for points mode.
  * Status Toggles: "Qualifiers Open/Closed" global toggle.
* **Tier Management:**
  * Add 1 to N tiered brackets (e.g., Gold, Silver, Bronze).
  * Fields per tier: Name, Slug (auto-derived from name for routing, e.g., "gold"), priority_order (1 = highest tier), Bracket Type (TRADITIONAL vs FLAT), Flat Width (matches per round, if flat), Participant Count (num_players), Primary/Secondary Hex Colors.
  * Read-only threshold badges calculated automatically:
    Tier Cutoff Range = (Sum of num_players of higher-priority tiers + 1) through (Sum of num_players through current tier).

### 5.2 Qualifier Ingestion & Dynamic Leaderboard (/src/features/qualifiers)
* **Player Selection:** Creatable combobox. Selecting an existing name reuses the player entity; entering a new name generates a local player record immediately.
* **Disqualification Flag:** A player profile toggle (is_disqualified: boolean) that drops the competitor to the bottom of the leaderboard as "DQ" without bracket assignment.
* **Calculation Engines:**
  * **HIGH_SCORE:** Rank derived from MAX(score).
  * **AVERAGE_OF_X:**
    * In Progress: While qualifiers are open, calculate the arithmetic mean of all attempts submitted so far. Display the running count badge (e.g., "Ao1" if 1 score submitted, "Ao2" if 2).
    * Completed: When qualifiers are marked closed (or player marked complete), any missing attempts up to X are calculated as 0.
  * **POINTS:** Each submitted score earns the value of the highest threshold met (non-cumulative per attempt). Total score is the cumulative sum of points across all valid attempts.
* **Leaderboard Display:**
  * Live-sorted table with row backgrounds matching tier colors.
  * Displays: Rank, Seed (within tier), Player Name, Attempts/Format Details, Final Value.
  * Players below all tier cutoffs render with neutral styling as "DNQ" (Did Not Qualify).

### 5.3 Match Entry Feed & Scoring (/src/features/bracket)
* Mobile-responsive Match Card Feed under /manage/bracket, filterable by tier and round.
* Tapping a playable card opens a score drawer with dynamic game rows.
* Match completes automatically when a player reaches ceil(best_of / 2) game wins.
* Best-of-X overrides available at the round and match levels.
* "Forfeit" toggle freezes the match and awards the win without fabricating game scores.

### 5.4 Final Tournament Standings (/src/features/tournament)
* Automated rollup summary table displayed upon conclusion of tier brackets.
* Derives final placements per tier directly from match completion results:
  * 1st Place: Finals Winner (Champion)
  * 2nd Place: Finals Loser (Runner-up)
  * 3rd/4th Place: Semifinals Losers
  * 5th–8th Place: Quarterfinals Losers (and cascading for earlier rounds)

---

## 6. Phase 4 Specifications: Relational Persistence (Neon + Drizzle)

### 6.1 Schema Definitions
All entities include id (UUID) and created_at (timestamp).

* **players:** id, name (unique), pb (int, manual), is_disqualified (boolean, default false), notes (text).
* **tournaments:** id, name, qual_format (enum: HIGH_SCORE, AVERAGE_OF_X, POINTS), qual_average_count (int, nullable), points_config (jsonb, nullable), quals_closed (boolean, default false), is_verified (boolean, default false).
* **bracket_tiers:** id, tournament_id (FK), priority_order (int), name (text), bracket_type (enum: TRADITIONAL, FLAT), flat_width (int, nullable), num_players (int), primary_color (text), secondary_color (text).
* **tournament_players:** tournament_id (FK), player_id (FK), tier_id (FK, nullable), seed (int, nullable), quals_completed (boolean, default false).
* **qualifier_submissions:** id, tournament_id (FK), player_id (FK), score (int).
* **matches:** id, tier_id (FK), round_number (int), player1_id (FK, nullable), player2_id (FK, nullable), winner_id (FK, nullable), loser_id (FK, nullable), best_of (int), is_forfeit (boolean, default false).
* **games:** id, match_id (FK), player1_score (int), player2_score (int), winner_id (FK), loser_id (FK), is_intentional_topout (boolean, default false).

---

## 7. Phase 5 Specifications: Production Deployment & Polish

* **Access Security:** Shared Passphrase (PIN) gating all /manage/* routes.
* **OBS Broadcast Displays:** /obs/* routes rendering clean, 16:9 transparent canvases free of navigation, scrollbars, or administrative controls.
* **Bracket Visuals:** Dynamic SVG lines connecting feeder matches to their downstream round nodes.