# SPEC.md: Tournament Manager

## 1. Project Overview
A web-based bracket and leaderboard manager built for competitive gaming tournaments (modeled on Classic Tetris tournament standards). The application provides real-time reactive updates, retro OBS overlays, customizable qualifying formats (High Score, Average of X, Points), flat and traditional bracket routing, and mobile-responsive match recording for floor judges.

The system prioritizes human readability, deterministic rules, minimal runtime overhead, and zero over-engineered dead code for rare edge cases.

---

## 2. Project Status & Roadmap

* **Phase 1: Core Routing Engine (Complete)**
  * Pure mathematical functions for traditional single-elimination and flat brackets. Strict bye invariant enforced (no phantom match entities; players advance directly to their calculated entry round; total matches strictly equals $N - 1$).
* **Phase 2: Reactive UI & Match Recording (Complete)**
  * Visual bracket tree, mobile-responsive match card feed, and drawer-based score submission. Multi-game score tracking, dynamic match win derivations, forfeit flags, and Best-of-X overrides.
* **Phase 3: Unified In-Memory Pipeline & Refinements (Active Goal)**
  * Wire the end-to-end tournament lifecycle in browser state (LocalStorage): Admin setup -> Qualifiers Mode & live leaderboard -> Match Play Mode locking -> Global Standings with competitive exit tiebreakers and performance analytics.
  * Execute across 5 structured priorities:
    * **Priority 1:** UI Rebranding, Ergonomics, Modal Guards & Mode Terminology
    * **Priority 2:** Tournament Lifecycle & Data Simulation Controls
    * **Priority 3:** Global Tournament Standings & Competitive Exit Tiebreakers
    * **Priority 4:** Qualifiers Table Density & Competitor Detail Drawer
    * **Priority 5:** Global Player Pool Directory (`classic_tetris_global_players`) & Tournament Roster
* **Phase 4: Relational Persistence (Upcoming)**
  * Translate finalized TypeScript data contracts into Neon serverless PostgreSQL tables via Drizzle ORM schemas and server functions.
* **Phase 5: Production Deployment, OBS Overlays & Polish (Upcoming)**
  * Vercel edge deployment, PIN security on `/manage/*` routes, full-bleed 16:9 `/obs/*` browser sources, and SVG bracket connector lines.

---

## 3. Directory Structure (Strict Feature-Driven)
* `/src/features/bracket/` – Bracket trees, mathematical routing, node state, match score drawers.
* `/src/features/qualifiers/` – Score submission, dynamic leaderboard sorting, tier cutoff assignments, competitor detail drawer.
* `/src/features/tournament/` – Admin setup forms, tier configuration (priority order, width, cutoffs, colors), global standings.
* `/src/features/players/` – Global player pool directory and tournament roster registration.
* `/src/routes/` – Top-level page routes (`/manage/*`, `/obs/*`).
* `/src/components/` – Shared UI components (inputs, modals, buttons, table wrappers).

---

## 4. Universal Invariants & Exact Mathematical Rules

### 4.1 Bye Handling & Match Invariant
* Total playable Match records generated per tier must equal exactly:
  $$\text{total\_matches} = N - 1$$
* Byes are never represented as playable matches and never accept scores.
* Players receiving byes are placed directly into their calculated entry round:
  $$\text{entry\_round} = \text{total\_byes\_for\_seed} + 1$$
* Any node awaiting a feeder or bye recipient initializes with `player2_id: null`. Matches appear in score entry interfaces only when both competitors are confirmed.

### 4.2 Tier-Relative Seeding
* Leaderboard ranks must be normalized relative to the tier before passing to the bracket generator:
  $$\text{tier\_seed} = \text{global\_rank} - \text{tier\_start\_rank} + 1$$
* *Example:* In a 12-player Silver tier composed of leaderboard ranks 13 through 24, Rank 13 becomes Seed 1, Rank 14 becomes Seed 2, through Rank 24 becoming Seed 12.

### 4.3 Exact Tiebreaker Mathematical Formulas

#### 1. Qualifiers High Score & Maxout Engine:
* **Maxout Threshold:** Any score $\ge 999,999$ is a Maxout.
* For a competitor's set of qualifier submissions $S$:
  $$\text{maxout\_count} = |\{ s \in S \mid s.\text{score} \ge 999,999 \}|$$
  $$\text{kicker\_score} = \max(\{ s.\text{score} \mid s \in S \land s.\text{score} < 999,999 \} \cup \{ 0 \})$$
* **Sorting Hierarchy for High Score Mode:**
  1. $\text{maxout\_count}$ descending (e.g. 2 maxouts > 1 maxout > 0 maxouts).
  2. If $\text{maxout\_count} > 0$: $\text{kicker\_score}$ descending (if a player has only maxouts, kicker is 0).
  3. If $\text{maxout\_count} == 0$: highest score $\max(S)$ descending.
  4. Deterministic fallback: earlier submission timestamp ascending, then player ID ascending.

#### 2. Qualifiers Average of X Engine:
* In-progress: running arithmetic mean of attempts submitted so far.
* Finalized / Locked: missing attempts up to $X$ are computed as score 0:
  $$\text{final\_average} = \text{round}\left(\frac{\sum_{i=1}^n \text{score}_i}{\max(n, X)}\right)$$

#### 3. Competitive Intra-Round Exit Tiebreaker (Final Standings):
* For all players eliminated in the same bracket round $R$ (e.g., Round of 16 losers):
  * Let $M$ be the match in which the competitor was eliminated.
  * $\text{exit\_game\_wins}$: Games won by the player in match $M$.
  * Forfeit rule: unplayed games in a forfeit count as losses with score 0.
  * Let $L$ be the multiset of scores in games the player lost in match $M$ (including 0s for forfeit losses).
  * $\text{avg\_loss\_score}$:
    $$\text{avg\_loss\_score} = \begin{cases} \frac{\sum L}{|L|}, & \text{if } |L| > 0 \\ 0, & \text{if } |L| == 0 \end{cases}$$
* **Sorting Hierarchy within an Elimination Round:**
  1. $\text{exit\_game\_wins}$ descending (e.g. 2–3 loss > 1–3 loss > 0–3 loss).
  2. $\text{avg\_loss\_score}$ descending (highest average score across lost games in that exit match).
  3. Overall tournament match record (wins minus losses in tournament match play).
  4. Overall tournament game score average (average score across all tournament games played).
  5. Initial qualifying seed ascending (higher seed breaks the tie).

#### 4. Global Standings Sequential Ranking (#1 to #N):
* Standings are strictly **Global** and continuous (#1 to #N) across the entire tournament:
  * **Tier 1 (Gold):**
    * Rank 1: Tier Champion
    * Rank 2: Tier Runner-up (lost in Finals)
    * Ranks 3–4: Semifinalists (sorted by Exit Tiebreaker)
    * Ranks 5–8: Quarterfinalists (sorted by Exit Tiebreaker)
    * Ranks 9–16: Round of 16 losers (sorted by Exit Tiebreaker)
  * **Tier 2 (Silver):** Begins sequentially at $\text{Gold Capacity} + 1$ (Rank 17 for Champion, Rank 18 for Runner-up, etc.).
  * **Tier 3 (Bronze, if present):** Continues sequentially.
  * **DNQ (Did Not Qualify):** Competitors who did not qualify for any bracket. Their relative order is determined directly by their qualifying leaderboard scores, ranked immediately after all bracket participants.
  * **DQ (Disqualified):** Competitors with `isDisqualified: true` placed at the absolute bottom, labeled "DQ".

### 4.4 Personal Best (PB) Updates
* `player.personalBest` is strictly a manual field edited via the player management form. Match and qualifier scores must never auto-mutate this value.

### 4.5 Tournament Modes & Lifecycle
1. **Mode Terminology:**
   * The term "Draft" is eliminated entirely.
   * Modes are **"Qualifiers Mode"** and **"Match Play Mode"**.
   * On `Tournament`, this state is stored as `isLocked: boolean` (`false` = Qualifiers Mode, `true` = Match Play Mode). The legacy `qualsClosed` field is retired.
2. **Qualifiers Mode (`isLocked === false`):**
   * Leaderboard accepts incoming qualifier submissions and dynamically previews bracket seeding.
   * **Lockdown Invariant:** Match cards across all views (Visual Bracket, Organizer Sheet, Judge Match Feed) are strictly non-clickable. Score entry drawers must never open.
   * Banner: *"QUALIFIERS MODE — Seeding preview active. Click 'Lock Brackets & Begin Match Play' to start matches."*
3. **Lock Brackets & Begin Match Play (`isLocked === true`):**
   * Double-confirmation modal freezes seeds and instantiates static match records for floor scoring.
   * Late qualifier edits update historical records but never alter locked match pairings.
4. **Unlock Rule (Safety Invariant):**
   * Reverting back to Qualifiers Mode is permitted **only if exactly 0 match scores have been recorded**.
   * If any match contains game scores, the unlock action is strictly disabled with the message: *"Cannot unlock: Match play has begun. Clear recorded match scores before unlocking."*
5. **Modal & Drawer Dismissal Safety:**
   * Neither drawers (`MatchScoreDrawer`, `PlayerDetailDrawer`) nor modals (`QualifierEntryModal`, confirmation modals) may dismiss on backdrop/scrim click.
   * Dismissal requires an explicit user click on **Cancel**, **Save / Submit**, or the top-right **`X`** button.

---

## 5. Phase 3 Detailed Specifications & Execution Roadmap

### 5.1 Admin Tournament & Tier Setup (`/src/features/tournament`)
* **Default Clean Slate & Fresh Onboarding:**
  * When opening the app fresh with 0 tournaments, user lands directly on the home switcher page with a clean empty state inviting them to click **"+ Create New Tournament"**.
  * Creating a tournament in the modal captures Name/Slug/Format/Date/Location and upon clicking **"Create & Configure"**, navigates directly to `/:slug/manage/settings` to allow configuring tiers and running simulation controls.
  * New tournaments initialize 100% empty (0 players, 0 qualifier scores, 0 matches).
* **Form Dirty State Tracking:**
  * The **"Save Configuration"** button on `TournamentAdminForm` remains disabled (`disabled={!isDirty}`) until the user modifies any field or tier.
* **Unsaved Changes Navigation Guard:**
  * Attempting to navigate away while the form is dirty triggers an in-app confirmation modal: *"Are you sure you want to leave? Unsaved changes will be lost."* with "Stay" and "Discard & Leave" options.
* **Tier Color Binding:**
  * `tier.primaryColor` and `tier.secondaryColor` dynamically bind to Visual Bracket and Match Feed: round header badges, match card borders, winner highlighting, and trophy/winner SVGs.
* **Data Management & Testing Controls (in Settings):**
  * Section titled **"Data Management & Simulation"**:
    * **"Seed Qualifiers Only" Button:** Disabled if any tournament data exists. Populates bracket capacity + 4 DNQs with realistic qualifier submissions and leaves the tournament in Qualifiers Mode.
    * **"Simulate Full Tournament" Button:** Disabled if any tournament data exists. Seeds qualifiers, locks brackets, and simulates complete match scores across all tiers so final standings are immediately viewable.
    * **"Clear All Tournament Data" Button:** Destructive red action with a speedbump confirmation modal to reset back to a clean slate (`qualifierSubmissions = []`, `matchScores = {}`, `playersPool = []`, `tournamentPlayers = {}`, `isLocked = false`).
    * Completely remove the legacy "Reset Demo" button and mock pipelines.

### 5.2 Qualifier Ingestion & Leaderboard (`/src/features/qualifiers`)
* **Qualifier Entry Modal:**
  * Creatable player combobox + score input.
  * Submit button is disabled until **both** player and score fields are dirty, non-empty, and valid.
  * Backdrop click dismissal is disabled.
* **Leaderboard Table Density:**
  * Clean layout showing only format-relevant columns:
    * `HIGH_SCORE`: Best score. If maxout format ($999,999+$), displays count of maxouts (e.g., `2x Max`) and kicker score.
    * `AVERAGE_OF_X`: Displays the $X$ scores and the running/final average in Score Rating.
    * `POINTS`: Total accumulated points.
  * Row backgrounds and rank badges reflect tier cutoff colors. Players below cutoffs are styled as "DNQ".
* **Competitor Detail Slide-Out Drawer (`PlayerDetailDrawer`):**
  * Triggered by clicking any player row on the leaderboard.
  * Slide-out drawer displaying:
    * Competitor profile (Name, Country, PB, Playstyle, Seed/Tier assignment).
    * Chronological audit log of all qualifier submissions for this tournament (timestamp, score, format contribution).
    * Tournament match history and stats (games won/lost, average score on losses, match outcomes) once in Match Play Mode.
  * Backdrop click dismissal is disabled.

### 5.3 Match Entry Feed & Scoring (`/src/features/bracket`)
* Disabled during Qualifiers Mode; active during Match Play Mode.
* Mobile-responsive Match Card Feed under `/:slug/manage/bracket`, filterable by tier and round.
* Score Drawer allows multi-game score entry, forfeit flags, and Best-of-X overrides.
* Match automatically completes when a player reaches $\lceil \text{best\_of} / 2 \rceil$ wins.

### 5.4 Global Tournament Standings (`/src/features/tournament`)
* Rendered at `/:slug/standings`.
* **Visual Presentation:**
  * Renders as one giant list styled symmetrically with the qualifiers leaderboard (same tier divider headers, badges, and color themes).
  * Numbered sequentially #1 to #N across the whole event.
  * Performance Stats Columns:
    * **Overall Score Average:** Mean score across all games played in the tournament run.
    * **Match Record:** e.g. `2–1`.
    * **Game Record:** e.g. `7–5`.
    * **Exit Details / Loss Stats:** e.g. `Lost 2–3 (Loss Avg: 812,400)`.
    * **Qual vs. Final Rank Delta:** Compares initial qualifying placement to final rank (e.g. `Qual #4 -> Final #1 (+3)` or `Qual #1 -> Final #5 (-4)`).
  * DNQ players listed immediately following bracket participants in their qualifier order.
  * Disqualified competitors placed at the absolute bottom.

---

### 5.5 Phase 3 Execution Priorities

```
Phase 3 Execution Roadmap
 ├── Priority 1: UI Rebranding, Ergonomics, Modal Guards & Mode Terminology
 ├── Priority 2: Tournament Lifecycle & Data Simulation Controls
 ├── Priority 3: Global Tournament Standings & Competitive Exit Tiebreakers
 ├── Priority 4: Qualifiers Table Density & Competitor Detail Drawer
 └── Priority 5: Global Player Pool Directory (classic_tetris_global_players) & Tournament Roster
```

1. **Priority 1: UI Rebranding, Ergonomics, Modal Guards & Mode Terminology**
   - Rebrand the UI from "CTWC" to generic "Tournament Manager" across headers, logos, and document title.
   - Rename "Draft" to "Qualifiers Mode" and "Verified" to "Match Play Mode" across all views and stores.
   - Lock down match cards in `BracketVisualizer`, `OrganizerSheet`, and `MatchCardFeed` during Qualifiers Mode (drawer disabled).
   - Prevent backdrop dismiss on `MatchScoreDrawer` and `QualifierEntryModal`.
   - Add dirty-state tracking to `TournamentAdminForm` ("Save Configuration" disabled until dirty).
   - Implement unsaved changes navigation guard modal on settings.
   - Guard `QualifierEntryModal` submit button (disabled until player & score dirty/valid).
   - Bind `tier.primaryColor` and `tier.secondaryColor` to round headers, match borders, winner labels, and trophy SVGs.

2. **Priority 2: Tournament Lifecycle & Data Simulation Controls**
   - Retire `qualsClosed` field; unify lifecycle into `isLocked: boolean` ("Qualifiers Mode" vs "Match Play Mode").
   - Streamline lifecycle transition to "Lock Brackets & Begin Match Play".
   - Enforce unlock invariant: blocking unlock if any match has recorded scores.
   - Default fresh experience to 0 tournaments on home switcher; modal "Create & Configure" routes to `/:slug/manage/settings` with clean slate (0 data).
   - Add "Seed Qualifiers Only", "Simulate Full Tournament", and "Clear All Tournament Data" buttons in settings.
   - Purge legacy "Reset Demo" button and code.

3. **Priority 3: Global Tournament Standings & Competitive Exit Tiebreakers**
   - Refactor standings engine (`standings.ts`) to output a unified #1 to #N global list across all tiers.
   - Implement exact exit-round tiebreaker formula: game wins in exit match $\rightarrow$ average score on losses (forfeits = 0s) $\rightarrow$ tournament match record $\rightarrow$ tournament game average $\rightarrow$ seed.
   - Update `FinalStandingsTable.tsx` and `FinalStandingsPage.tsx` to render the unified global standings with performance analytics and Qual vs. Final rank delta.

4. **Priority 4: Qualifiers Table Density & Competitor Detail Drawer**
   - Implement Maxout count + kicker tiebreaker formula in `scoring.ts`.
   - Declutter `LeaderboardTable.tsx` columns (High Score + Maxout/kicker, AoX with X scores, Points).
   - Build `PlayerDetailDrawer.tsx` slide-out showing attempt logs and tournament match breakdown on player row click.

5. **Priority 5: Global Player Pool Directory & Tournament Roster**
   - Store global player pool under LocalStorage key `classic_tetris_global_players`.
   - Create `/players` route and master player directory view (name, manual PB, notes, country/tag).
   - Implement tournament roster registration (import from global pool or add new).

---

## 6. Phase 4 Specifications: Relational Persistence (Neon + Drizzle)

### 6.1 Schema Definitions
All entities include `id` (UUID) and `created_at` (timestamp).

* **players:** `id`, `name` (unique), `pb` (int, manual), `is_disqualified` (boolean, default false), `notes` (text).
* **tournaments:** `id`, `name`, `slug` (text, unique), `qual_format` (enum: `HIGH_SCORE`, `AVERAGE_OF_X`, `POINTS`), `qual_average_count` (int, nullable), `points_config` (jsonb, nullable), `is_locked` (boolean, default false).
* **bracket_tiers:** `id`, `tournament_id` (FK), `priority_order` (int), `name` (text), `bracket_type` (enum: `TRADITIONAL`, `FLAT`), `flat_width` (int, nullable), `num_players` (int), `primary_color` (text), `secondary_color` (text).
* **tournament_players:** `tournament_id` (FK), `player_id` (FK), `tier_id` (FK, nullable), `seed` (int, nullable).
* **qualifier_submissions:** `id`, `tournament_id` (FK), `player_id` (FK), `score` (int).
* **matches:** `id`, `tier_id` (FK), `round_number` (int), `player1_id` (FK, nullable), `player2_id` (FK, nullable), `winner_id` (FK, nullable), `loser_id` (FK, nullable), `best_of` (int), `is_forfeit` (boolean, default false).
* **games:** `id`, `match_id` (FK), `player1_score` (int), `player2_score` (int), `winner_id` (FK), `loser_id` (FK), `is_intentional_topout` (boolean, default false).

---

## 7. Phase 5 Specifications: Production Deployment & Polish

* **Access Security:** Shared Passphrase (PIN) gating all `/manage/*` routes.
* **OBS Broadcast Displays:** `/obs/*` routes rendering clean, 16:9 transparent canvases free of navigation, scrollbars, or administrative controls.
* **Bracket Visuals:** Dynamic SVG lines connecting feeder matches to their downstream round nodes.