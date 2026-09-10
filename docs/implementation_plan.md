# Phase 3 Implementation Plan: Unified In-Memory Pipeline & Refinements

This implementation plan details the resumption and execution of **Phase 3** as specified in [Tetris Tournament Manager.md](../Tetris%20Tournament%20Manager.md).

Phase 3 transitions the application to a polished in-memory tournament operations platform across 5 structured priorities:
1. **Priority 1:** UI Rebranding, Ergonomics, Modal Guards & Mode Terminology
2. **Priority 2:** Tournament Lifecycle & Data Simulation Controls
3. **Priority 3:** Global Tournament Standings & Competitive Exit Tiebreakers
4. **Priority 4:** Qualifiers Table Density & Competitor Detail Drawer
5. **Priority 5:** Global Player Pool Directory (`classic_tetris_global_players`) & Tournament Roster

To facilitate manual testing and focused reviews, the work is organized into **10 scoped, logical commits** (2 per priority).

---

## User Review & Decisions Incorporated

> [!NOTE]
> The following explicit user design decisions are locked into the plan:
> 1. **Rebranding:** Remove all references to "CTWC" across the entire UI in favor of **"Tournament Manager"** (generic Classic Tetris tournament manager, versatile for competitive gaming).
> 2. **Global Player Storage:** Dedicated shared pool persisted under the key `classic_tetris_global_players` in LocalStorage.
> 3. **Fresh Experience Flow:** On a brand-new experience with 0 tournaments, land on the home page with a prominent clean state and "+ Create New Tournament". Completing the modal and clicking **"Create & Configure"** navigates straight to `/:slug/manage/settings`, where the user sees the settings page with Phase 3 simulation and seeding buttons.
> 4. **Tournament Deletion on Landing Page:** Option on the home switcher cards to delete tournaments if they have no qualifier data and no recorded match scores, guarded by a confirmation speedbump modal.
> 5. **Destroying All Brackets in Settings:** Allow users to delete all brackets/tiers (even the final one), guarded by a confirmation speedbump modal for each tier deletion.

---

## Proposed Scoped Commits & Execution Plan

### Priority 1: UI Rebranding, Ergonomics, Modal Guards & Mode Terminology

#### Commit 1.1: UI Rebranding, Mode Terminology, Modal Backdrop Guards & Match Lockdown [COMPLETE]
* **Objective:** Rebrand UI to "Tournament Manager" (remove "CTWC"), replace "Draft"/"Verified" with "Qualifiers Mode"/"Match Play Mode", lock down match cards in Qualifiers Mode across all views, and disable backdrop dismissal on modals and drawers.
* **Changes:**
  * [index.html](../index.html): Update `<title>` from `Tetris Tournament Manager` to `Tournament Manager`.
  * [TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx): Rebrand logo to `TOURNAMENT MANAGER` (remove CTWC).
  * [TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx): Rebrand logo to `TOURNAMENT MANAGER` (remove CTWC); update status badge from `DRAFT`/`VERIFIED` to `QUALIFIERS MODE`/`MATCH PLAY MODE`.
  * [BracketDraftBanner.tsx](../src/features/bracket/components/BracketDraftBanner.tsx): Update banner text to *"QUALIFIERS MODE — Seeding preview active. Click 'Lock Brackets & Begin Match Play' to start matches."*
  * [BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx): Disable match node `onClick` and set `cursor: default` when in Qualifiers Mode (`!tournament.isVerified` / `!tournament.isLocked`).
  * [OrganizerSheetMatrix.tsx](../src/features/bracket/components/OrganizerSheetMatrix.tsx) & [MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx): Ensure consistent non-clickable match card styling during Qualifiers Mode.
  * [MatchScoreDrawer.tsx](../src/features/bracket/components/MatchScoreDrawer.tsx): Remove backdrop click dismissal (`onClick={onClose}` on overlay removed; dismissal requires explicit Cancel, Save, or `X`).
  * [QualifierEntryModal.tsx](../src/features/qualifiers/components/QualifierEntryModal.tsx): Remove backdrop click dismissal (`onClick={onClose}` on overlay removed).

#### Commit 1.2: Admin Form Dirty Tracking, Navigation Guard & Dynamic Tier Colors [COMPLETE]
* **Objective:** Add dirty state tracking to `TournamentAdminForm`, guard unsaved changes when navigating away from settings, guard qualifier submission inputs, speedbump confirmation modal for tier deletion (allowing deleting all tiers), and bind tier colors to visual bracket elements.
* **Changes:**
  * [TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx):
    * Track initial form state vs current state (`isDirty: boolean`).
    * Disable "Save Configuration" button when `!isDirty`.
    * Add unsaved changes confirmation modal ("Stay" vs "Discard & Leave").
    * Remove `disabled={tiers.length <= 1}` on tier delete; add speedbump confirmation modal for deleting any bracket.
    * Handle empty tier state cleanly (`tiers.length === 0`).
    * Provide "Discard Changes" button to revert edits back to saved values.
  * [TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx):
    * Add delete tournament button with safety check (disabled if scores exist) and speedbump confirmation modal.
  * [TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx): Hook navigation through settings guard if dirty.
  * [ManageTournamentSettingsPage.tsx](../src/routes/ManageTournamentSettingsPage.tsx): Intercept navigation if settings form is dirty and show unsaved changes confirmation modal.
  * [QualifierEntryModal.tsx](../src/features/qualifiers/components/QualifierEntryModal.tsx): Guard submit button (`disabled={!isScoreValid}`) until player is selected and score is a non-empty integer `> 0`.
  * [BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx) & [MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx): Dynamically bind `tier.primaryColor` and `tier.secondaryColor` to round header badges, match card borders, winner slot backgrounds, and trophy icons.

---

### Priority 2: Tournament Lifecycle & Data Simulation Controls

#### Commit 2.1: Unify Lifecycle to `isLocked`, Clean Slate Defaults & Purge Legacy Reset Demo [COMPLETE]
* **Objective:** Replace legacy `isVerified` and `qualsClosed` with single source of truth `isLocked: boolean`, initialize new tournaments with 0 data, and remove the legacy "Reset Demo" button.
* **Changes:**
  * [types.ts](../src/features/tournament/types.ts): Update `Tournament` interface: replace `isVerified` and `qualsClosed` with `isLocked: boolean`.
  * [store.tsx](../src/features/tournament/store.tsx):
    * Update storage key to `tournament_manager_tournaments_v3` (with migration from `ctwc_tournaments_v3`).
    * On fresh state with 0 tournaments, start with `[]` (empty list).
    * `createTournament`: clean slate defaults (`playersPool: []`, `qualifierSubmissions: []`, `tournamentPlayers: {}`, `matchScores: {}`, `isLocked: false`).
    * Rename `verifyBrackets` to `lockTournament`, update `unlockBrackets`.
    * Enforce unlock invariant: unlock is blocked if `Object.values(tournament.matchScores)` contains any recorded game scores with error message: *"Cannot unlock: Match play has begun. Clear recorded scores before unlocking."*
    * Remove `resetTournamentData` legacy demo reset function.
  * [TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx):
    * Clean empty state when 0 tournaments exist, inviting user to click **"+ Create New Tournament"**.
    * Remove backdrop click dismissal on create modal.
    * On submit, navigate directly to `/:slug/manage/settings`.
  * [VerifyBracketModal.tsx](../src/features/tournament/components/VerifyBracketModal.tsx): Update to call `lockTournament`.
  * [TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx): Remove the legacy "Reset Demo" button, use `isLocked`.
  * Update [BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx), [MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx), [OrganizerSheetMatrix.tsx](../src/features/bracket/components/OrganizerSheetMatrix.tsx), and [LeaderboardTable.tsx](../src/features/qualifiers/components/LeaderboardTable.tsx) to consume `isLocked`.

#### Commit 2.2: Data Management & Simulation Controls in Settings [NEXT]
* **Objective:** Provide sandbox simulation controls inside tournament settings: "Seed Qualifiers Only", "Simulate Full Tournament", and "Clear All Tournament Data".
* **Changes:**
  * [store.tsx](../src/features/tournament/store.tsx):
    * Add action `seedQualifiers(tournamentId: string)`: Generates bracket capacity + 4 DNQ realistic competitors with scores tailored to `qualFormat` (`HIGH_SCORE`, `AVERAGE_OF_X`, `POINTS`), leaving in Qualifiers Mode.
    * Add action `simulateFullTournament(tournamentId: string)`: Seeds qualifiers, locks brackets, and simulates game scores and winners across all rounds up to tier champions.
    * Add action `clearTournamentData(tournamentId: string)`: Resets `qualifierSubmissions = []`, `matchScores = {}`, `playersPool = []`, `tournamentPlayers = {}`, `isLocked = false`.
  * [TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx):
    * Add new section **"Data Management & Simulation"**:
      * "Seed Qualifiers Only" button (disabled if data exists).
      * "Simulate Full Tournament" button (disabled if data exists).
      * "Clear All Tournament Data" red button with confirmation speedbump modal.

---

### Priority 3: Global Tournament Standings & Competitive Exit Tiebreakers

#### Commit 3.1: Competitive Intra-Round Exit Tiebreaker Engine & Global Standings Logic
* **Objective:** Implement the exact mathematical competitive exit tiebreaker formula and sequential #1 to #N global ranking engine.
* **Changes:**
  * [standings.ts](../src/features/tournament/standings.ts):
    * Refactor `calculateGlobalStandings(tournament: Tournament)`:
      * Sequence: Tier 1 (Gold) -> Tier 2 (Silver begins at `Gold Capacity + 1`) -> Tier 3 (Bronze) -> DNQ (ranked by qualifier score) -> DQ (at bottom).
      * Implement exact exit tiebreaker hierarchy for competitors eliminated in the same bracket round:
        1. `exit_game_wins` descending (e.g. 2–3 > 1–3 > 0–3).
        2. `avg_loss_score` descending (average score across lost games in exit match; unplayed forfeit games count as score 0).
        3. Overall tournament match record (wins minus losses).
        4. Overall tournament game score average (across all matches played).
        5. Initial qualifying seed ascending.
      * Calculate `qualRank` and `rankDelta = qualRank - finalRank`.

#### Commit 3.2: Unified Global Standings Table & Analytics UI
* **Objective:** Replace tier tab switcher in standings with a single continuous #1 to #N table matching the qualifiers leaderboard styling, complete with performance analytics columns and rank deltas.
* **Changes:**
  * [FinalStandingsTable.tsx](../src/features/tournament/components/FinalStandingsTable.tsx):
    * Render continuous global table with tier divider headers (Gold, Silver, Bronze, DNQ, Disqualified).
    * Display performance columns: Overall Score Average, Match Record, Game Record, Exit Details, Qual vs. Final Delta badge.
  * [FinalStandingsPage.tsx](../src/routes/FinalStandingsPage.tsx): Clean up layout and integrate new global table.

---

### Priority 4: Qualifiers Table Density & Competitor Detail Drawer

#### Commit 4.1: Maxout Count & Kicker Engine + Format-Dense Leaderboard Columns
* **Objective:** Implement Maxout count (>= 999,999) + kicker score sorting engine for `HIGH_SCORE` mode and declutter leaderboard table columns based on format.
* **Changes:**
  * [scoring.ts](../src/features/qualifiers/scoring.ts): Maxout rule (>= 999,999), `maxout_count` and `kicker_score` sorting hierarchy.
  * [LeaderboardTable.tsx](../src/features/qualifiers/components/LeaderboardTable.tsx): Format-dense column layout (`2x Max` badge and kicker for High Score, AoX chips and running average, Points).

#### Commit 4.2: Competitor Detail Slide-Out Drawer (`PlayerDetailDrawer`)
* **Objective:** Provide an in-depth slide-out drawer when clicking any player on the leaderboard, showing attempt audit history and tournament match stats.
* **Changes:**
  * **[NEW]** `src/features/qualifiers/components/PlayerDetailDrawer.tsx`: Attempt audit log + tournament match play record. Backdrop click dismissal disabled.
  * [LeaderboardTable.tsx](../src/features/qualifiers/components/LeaderboardTable.tsx): Connect row click to open drawer.

---

### Priority 5: Global Player Pool Directory & Tournament Roster

#### Commit 5.1: Global Player Pool Directory (`classic_tetris_global_players` & `/players` Route)
* **Objective:** Provide a master player pool catalog independent of individual tournaments to manage players, manual PBs, playstyles, countries, and notes under LocalStorage key `classic_tetris_global_players`.
* **Changes:**
  * [store.tsx](../src/features/tournament/store.tsx): Introduce `classic_tetris_global_players` CRUD.
  * **[NEW]** `src/features/players/components/PlayerDirectoryPage.tsx`: Master player pool table and "+ Add Player" modal.
  * [App.tsx](../src/App.tsx): Add route `/players`.

#### Commit 5.2: Tournament Roster Management & Registration
* **Objective:** Allow tournaments to import players from the global pool or add new competitors directly into the tournament roster.
* **Changes:**
  * [TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx): Add "Tournament Roster" section (import from master pool, view roster).
  * [CreatablePlayerSelect.tsx](../src/features/qualifiers/components/CreatablePlayerSelect.tsx): Suggest players from global pool.
