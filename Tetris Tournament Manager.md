# SPEC.md: Tetris Tournament Manager

## 1. Project Overview
A web-based bracket and leaderboard manager to replace Google Sheets for Classic Tetris tournaments. Features real-time reactive updates, CTWC-style retro OBS overlays, complex seeding (flat brackets), and customizable qualifying logic. Designed to be operated concurrently by multiple volunteers via mobile devices on the tournament floor.

## 2. Architecture & Tech Stack
* **Frontend:** Vite + React (Client-side SPA)
* **Routing:** React Router (Dynamic tournament slugs)
* **Database:** Neon (Serverless PostgreSQL)
* **ORM & Validation:** Drizzle ORM and Zod
* **Hosting & CI/CD:** Vercel (Edge CDN + Serverless Functions)
* **Verification:** Vitest (testing), ESLint, TypeScript compiler (tsc)

## 3. Directory Structure (Strict Feature-Driven)
* `/src/features/bracket/` - Bracket rendering, mathematical routing, and match state.
* `/src/features/qualifiers/` - Score entry polling, seeding calculation logic, leaderboards.
* `/src/features/tournament/` - Global settings, tier management, points configuration.
* `/src/features/players/` - Global player pool and tournament registration.
* `/src/routes/` - View-level components mapping to URL paths.
* `/src/components/` - Shared UI elements (buttons, inputs, layout wrappers).

## 4. Relational Data Models
All entities must include a `created_at` timestamp.

* **Tournament:** `id`, `name`, `qual_format` (Enum: `HIGH_SCORE`, `AVERAGE_OF_X`, `POINTS`), `qual_average_count` (Int, nullable), `points_config` (JSONB: `Array<{min_score: number, points: number}>`), `is_verified` (Boolean, default `false`).
* **BracketTier:** `id`, `tournament_id`, `priority_order` (Int, drives cutoff calculations), `name`, `bracket_type` (Enum: `TRADITIONAL`, `FLAT`), `flat_width` (Int, nullable), `num_players` (Int), `double_elimination` (Boolean, default `false`, disabled in UI for 1.0), `primary_color` (Hex), `secondary_color` (Hex).
* **Player (Global):** `id`, `name`, `pb` (Int), `notes` (Text).
* **TournamentPlayer (Join):** `tournament_id`, `player_id`, `seed` (nullable), `final_placement` (nullable).
* **QualifierSubmission:** `id`, `tournament_id`, `player_id`, `score`.
* **Match:** `id`, `tier_id`, `round_number`, `player1_id`, `player2_id`, `winner_id`, `loser_id`, `best_of` (Int, overrides tier/round default).
* **Game:** `id`, `match_id`, `player1_score`, `player2_score`, `winner_id`, `loser_id`, `is_intentional_topout` (Boolean, default `false`).

## 5. Architectural Constraints & UI Logic

* **Manual PB Tracking:** A player's personal best (`pb`) is strictly updated manually via the Player management UI. The system must not auto-mutate this value.
* **Bracket Verification Lifecycle:** 
  * The system defaults to a reactive DRAFT state, auto-seeding the leaderboard as qualifiers are entered.
  * A **"Verify Brackets"** button (accessible on mobile/desktop management views) locks the seeds. It requires a double-confirmation modal and runs a pre-check for tier-boundary ties. If a tie is found, it blocks the lock until a judge resolves it.
  * Once locked, the button toggles to **"Unlock Brackets"**, requiring another confirmation modal to revert to DRAFT state.
* **Mobile Match Entry UX:** 
  * The `/manage/bracket` route on mobile displays a scrollable, filterable Match Card Feed, completely decoupled from the visual bracket tree.
  * Tapping a match opens a responsive Bottom Drawer or Modal containing large touch targets for integer score entry.
  * Game rows append dynamically as scores are entered. No blank trailing spaces.
  * Includes a "Forfeit" toggle that freezes the match and awards the win to the remaining player without generating fake game scores.
  * Includes a `best_of` override (e.g., changing Bo5 to Bo7 on the fly).
  * Automated Completion: Once a player reaches $\lceil \text{best\_of} / 2 \rceil$ wins, the match is locked and the winner advances.
* **Qualifier Entry Concurrency:** The `/manage/qualifiers` page utilizes an inline persistent form for fast entry. The activity data grid auto-polls every 60s. Edit and Delete actions must launch isolated Modals to prevent focus loss during background polling.
* **Derived Bracket Thresholds:** The Admin bracket creation drawer dynamically calculates "Top" and "Bottom" placement thresholds using the `BracketTier` array sorted by `priority_order` and `num_players`. These fields are strictly read-only UI conveniences.
* **Flat Bracket Math:** Organizers input a "width" (matches per round). The routing algorithm cascades byes to top seeds, grouping adjacent bottom seeds in early rounds (highest vs. lowest within that specific tier subset).
* **OBS Broadcast View:** `/obs/*` routes strip all navigation, sidebars, and footers, rendering a clean, transparent 16:9 canvas optimized for OBS browser sources.

## 6. Phased Development Roadmap

### Phase 1: Core Routing Engine (TypeScript + Vitest)
* **Goal:** Bulletproof routing math without UI overhead.
* **Deliverables:** Pure functions for traditional/flat brackets. Unit tests verifying cascading byes and correct width logic.
* **Agent Rule:** Must run `npm run typecheck`, `npm run lint`, and `npm run test` successfully on every iteration before proceeding.

### Phase 2: Reactive UI (Vite + React + LocalStorage)
* **Goal:** Spreadsheet-like bracket reactivity and dual-view routing (Management vs OBS).
* **Deliverables:** CTWC-styled bracket rendering. Mock state persisted via LocalStorage. Implementation of the Mobile Match Card feed.

### Phase 3: Relational Persistence (Local Neon + Drizzle)
* **Goal:** Apply the full relational schema.
* **Deliverables:** Global Player pool vs. Tournament roster management. Live polling Qualifier entry. Leaderboard tie-handling (overlapping names).

### Phase 4: Cloud Deployment & Alpha Run (Vercel)
* **Goal:** Live deployment for the initial event alpha run.
* **Deliverables:** Vercel edge deployment. Passphrase (PIN) protection explicitly guarding all `/manage/*` routes. Public `/obs/*` routes remain open.

### Phase 5: Admin Tournament Management
* **Goal:** Dynamic event scaling.
* **Deliverables:** Master Admin dashboard to generate new tournaments, configure custom point thresholds via draggable drawers, and manage multi-tier cascading brackets.