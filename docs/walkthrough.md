# Walkthrough: Tournament Enhancements & Visual Bracket Polish

All 13 requested enhancements and fixes across player profiles, tournament standings, tiebreaker scoring & deletion, flat bracket width math, default points thresholds, format renaming to "# of Maxes", kicker simulation, round overrides editing UX, and qual sheet columns are complete and verified.

---

## 1. Summary of Changes

### 1.1 Player Profile Match History: Blue Score Styling for Ties
* **[PlayerDetailDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/PlayerDetailDrawer.tsx):**
  * In the match history score pills, tied games are detected when `winnerPlayerId === 'TIE'` or `player1Points === player2Points && player1Points > 0`.
  * Tied game scores are rendered in bright sky blue (`color: #38bdf8`, `background: rgba(56, 189, 248, 0.12)`, `border: 1px solid rgba(56, 189, 248, 0.4)`) with an inline `(TIE)` badge, distinguishing them from green (wins) and red (losses).

### 1.2 Player Profile Rank Lifecycle
* **[PlayerDetailDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/PlayerDetailDrawer.tsx):**
  * **Qualifiers Stage (`!tournament.isLocked`):** Displays **Qual Rank** with the player's current leaderboard rank.
  * **Bracket Match Play Stage (`tournament.isLocked && !isTournamentDone`):** Displays **Qual Seed** with the seed assigned when entering bracket play.
  * **Completed Tournament (`tournament.isLocked && isTournamentDone`):** Displays **Final Rank** reflecting the official final standing position (e.g. `1st`, `2nd`, `3rd`, etc.).

### 1.3 Tournament Standings: Champion Loss Average
* **[standings.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/standings.ts):**
  * Extended `calculateGlobalStandings` to compute `exitDetails` for the Tournament Champion using their games in the Grand Finals match, calculating their `avgLossScore` (average points scored in lost games, if any) or overall points average.
* **[FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx):**
  * In the "Exit Match / Loss Avg" column, the champion now displays their finals match score alongside `Loss Avg: <formatted>` or `Overall Avg: <formatted>` with a championship trophy badge, matching the loss average display format of other participants.

### 1.4 Tiebreaker Game Deletion & `(t)` Cleanup
* **[MatchScoreDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchScoreDrawer.tsx):**
  * Added a trash delete button for any tiebreaker game whose scores are `0 - 0` or empty.
  * Clicking the delete button removes the game, recalculates series scores, and updates `hasTiebreaker`.
* **[store.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/store.tsx):**
  * Fixed `saveMatchScores` so `tiebreakerActive` is dynamically determined by actual tied games or remaining tiebreaker games. If a tiebreaker game is deleted and no ties exist, `hasTiebreaker` is removed.
* **[BracketVisualizer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketVisualizer.tsx), [MatchCardFeed.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchCardFeed.tsx), and [OrganizerSheetMatrix.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/OrganizerSheetMatrix.tsx):**
  * Updated `hasTiebreaker` display logic to check if games actually contained tied scores. The `(t)` notation is stripped if no tie exists and no active tiebreaker games remain.

### 1.5 Flat Bracket Width Math & Dropdown
* **[flat.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/math/flat.ts):**
  * Implemented `getValidFlatWidths(playerCount)`: valid widths are powers of 2 ($2, 4, 8, \dots$) $\le \max(2, \lfloor \text{playerCount} / 2 \rfloor)$.
  * E.g. for 9 players: $[2, 4]$; for 16 players: $[2, 4, 8]$; for 4 players: $[2]$.
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Replaced manual number input with a `<select>` dropdown populated by `getValidFlatWidths(tier.playerCount)`.
  * `updateTier` automatically clamps `flatWidth` to a valid option whenever `playerCount` changes.
* **[flat.test.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/math/__tests__/flat.test.ts):**
  * Added unit test suite covering odd, even, and edge-case player counts.

### 1.6 Default Points Thresholds
* **[types.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/types.ts):**
  * Created `DEFAULT_POINTS_THRESHOLDS` constant:
    * 999,999: 2 pts
    * 1,099,999: 3 pts
    * 1,199,999: 4 pts
    * 1,299,999: 5 pts
    * 1,399,999: 6 pts
    * 1,499,999: 7 pts
    * 1,599,999: 8 pts
    * 1,699,999: 9 pts
    * 1,799,999: 10 pts
    * 1,899,999: 11 pts
    * 1,999,999: 13 pts
* **[TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/routes/TournamentSwitcherPage.tsx) & [TournamentAdminForm.tsx](file:///Users/jgrondski/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Automatically populates `DEFAULT_POINTS_THRESHOLDS` when creating a tournament with `POINTS` format or switching the qualifier format to Points Threshold System.

### 1.7 Format Renaming to "# of Maxes"
* Renamed "High Score (MAX of attempts)" to **# of Maxes** across:
  * **[TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/routes/TournamentSwitcherPage.tsx)**
  * **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/features/tournament/components/TournamentAdminForm.tsx)**
  * **[LeaderboardTable.tsx](file:///Users/jgrondski/src/features/qualifiers/components/LeaderboardTable.tsx)**

### 1.8 Round Overrides Editor UX
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Created `RoundOverridesEditor` sub-component with local `draftRows` state.
  * Adding or editing a round override marks the row as dirty without swapping or sorting rows.
  * Each override row has a **Save** check button (`<Check />`) next to Delete that is enabled only when dirty.
  * Rows only sort by `roundNumber` when **Save** is clicked, with CSS transitions (`transition: all 0.3s ease`).
  * Clicking Delete immediately removes the row and syncs the tier overrides.

### 1.9 Kicker in "# of Maxes" & 90% Simulation
* **[LeaderboardTable.tsx](file:///Users/jgrondski/src/features/qualifiers/components/LeaderboardTable.tsx):**
  * Replaced "High Score" column header with **Kicker** when the tournament format is `# of Maxes`.
* **[simulation.ts](file:///Users/jgrondski/src/features/tournament/simulation.ts):**
  * Updated qualifier simulation for `# of Maxes`: 90% of players are guaranteed to submit a kicker score ($< 999,999$) so realistic kicker scores are generated.

### 1.10 Qual Submissions Renaming & Chronological Order
* **[PlayerDetailDrawer.tsx](file:///Users/jgrondski/src/features/qualifiers/components/PlayerDetailDrawer.tsx):**
  * Renamed the submissions section on the player profile drawer from "Qualifier Attempts" to **Qual Submissions**.
  * Submissions are sorted chronologically by timestamp (`submittedAt - submittedAt`), with the earliest submission at the top and latest at the bottom.
* **[LeaderboardTable.tsx](file:///Users/jgrondski/src/features/qualifiers/components/LeaderboardTable.tsx):**
  * Removed the standalone "Attempts" column from the leaderboard table, reducing clutter.

### 1.11 Points Qual Mode Table Polish
* **[LeaderboardTable.tsx](file:///Users/jgrondski/src/features/qualifiers/components/LeaderboardTable.tsx):**
  * Renamed "Attempt Points Breakdown" column header to **Points Breakdown**.
  * Sorted attempt chips chronologically by timestamp.
  * For competitors who did not reach any point threshold (0 total points), displays their best raw score (e.g. `Top Score: 450,000`) instead of an empty space.

---

## 2. Verification Results

### 2.1 Vitest Unit Tests
All 85 tests across 11 test suites pass:
```bash
npm test

 RUN  v3.2.7 /Users/jgrondski/src/repos/tournament-manager

 ✓ src/features/bracket/math/__tests__/traditional.test.ts (13 tests)
 ✓ src/features/tournament/__tests__/store.test.ts (3 tests)
 ✓ src/features/bracket/math/__tests__/flat.test.ts (13 tests)
 ✓ src/features/bracket/math/__tests__/advance.test.ts (7 tests)
 ✓ src/features/players/__tests__/players.test.ts (5 tests)
 ✓ src/features/tournament/__tests__/standings.test.ts (8 tests)
 ✓ src/features/bracket/math/__tests__/round-overrides.test.ts (8 tests)
 ✓ src/features/tournament/__tests__/simulation.test.ts (7 tests)
 ✓ src/features/qualifiers/__tests__/scoring.test.ts (13 tests)
 ✓ src/features/tournament/__tests__/verification.test.ts (4 tests)
 ✓ src/features/bracket/__tests__/colorUtils.test.ts (4 tests)

 Test Files  11 passed (11)
      Tests  85 passed (85)
```

### 2.2 TypeScript & Lint Checks
```bash
npm run typecheck
# 0 errors

npm run lint
# 0 problems (0 errors, 0 warnings)
```

### 2.3 Production Build
```bash
npm run build
# vite v6.4.3 building for production...
# ✓ 1900 modules transformed.
# ✓ built in 2.63s
```
