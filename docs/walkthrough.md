# Walkthrough: Tournament Management, Visual Brackets, Match Scoring & Standings Enhancements

All 10 requested enhancements and bug fixes are complete, validated across the entire codebase, and verified with 80 passing unit tests, TypeScript typechecking, ESLint, and a successful Vite production build.

---

## 1. Summary of Changes

### 1.1 Clearable Number Inputs with Blur Validation & Refocus
* **[ClearableNumberInput.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/components/ClearableNumberInput.tsx):**
  * Created reusable input component supporting `min`, `max`, `step`, and optional `required`.
  * Allows backspacing and clearing down to an empty string `""` without forcing an immediate fallback value (e.g. `2`).
  * On blur: validates whether the entered value is a valid integer between `min` and `max`.
  * If invalid or empty when required: displays an inline error alert badge above the input and automatically refocuses the input field, while still allowing the input to remain empty.
* **Integrations across the app:**
  * **[TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/TournamentSwitcherPage.tsx):** Used for "Average of X Attempts" count.
  * **[GenerateFakePlayersModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/players/components/GenerateFakePlayersModal.tsx):** Used for competitor generation count.
  * **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):** Used for qualifier attempts, minimum qualification score, ranking points, flat bracket width, and tier player count.

### 1.2 Styled Native Dropdown Carats
* **[index.css](file:///Users/jgrondski/src/repos/tournament-manager/src/index.css):**
  * Added global styling for native `<select>` dropdowns:
    * Custom SVG chevron icon with `background-position: right 0.75rem center !important` and `padding-right: 2.25rem !important`.
    * `appearance: none; -webkit-appearance: none; cursor: pointer;`.
  * Updated inline styles in forms from `background` shorthand to `backgroundColor` so native styles and custom carats are never unintentionally overridden.

### 1.3 Dropped `(UP TO BO99)` from Settings
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Removed `(Up to Bo99)` from the tier configuration form label, changing it to clean `Best-of Default`.

### 1.4 Standings Country & Playstyle Chips Preservation
* **[standings.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/standings.ts):**
  * Updated `calculateGlobalStandings` to index `tournament.playersPool`.
  * Decorates all bracket participants (champion, runner-up, semifinalists, and eliminated round competitors) with their original `country` and `playstyle` chips.
* **[standings.test.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/__tests__/standings.test.ts):**
  * Added unit test verifying country and playstyle metadata retention across champion, runner-up, eliminated bracket players, and non-bracket qualifiers.

### 1.5 Player Profile Drawer from Standings & Tournament Roster
* **[FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx):**
  * Made competitor names in the global and tier standings tables clickable buttons that open `PlayerDetailDrawer`.
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Made competitor names in the registered Tournament Roster table clickable buttons that open `PlayerDetailDrawer`.

### 1.6 Hover Separation & Player Profile Drawer in Bracket Views
* Separated hover targets and clicks across all bracket views:
  * **[BracketVisualizer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketVisualizer.tsx):**
    * Competitor name slots have distinct hover styling (golden border and subtle highlight).
    * Clicking a player's name triggers `e.stopPropagation()` and opens `PlayerDetailDrawer`.
    * Champion card winner name is also clickable to open `PlayerDetailDrawer`.
    * Clicking anywhere else on the match container opens `MatchScoreDrawer`.
  * **[OrganizerSheetMatrix.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/OrganizerSheetMatrix.tsx):**
    * Competitor cells have independent hover highlight and open `PlayerDetailDrawer` on click with `e.stopPropagation()`.
    * Clicking anywhere else on the match row opens `MatchScoreDrawer`.
  * **[MatchCardFeed.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchCardFeed.tsx):**
    * Player name badges have independent hover styling and click handler for `PlayerDetailDrawer`.
    * Clicking anywhere else on the match card opens `MatchScoreDrawer`.

### 1.7 Removed Trophies from Organizer Sheet & Floor Judge
* **[OrganizerSheetMatrix.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/OrganizerSheetMatrix.tsx):**
  * Removed `<Trophy>` icon next to winning players in matrix match cells.
* **[MatchCardFeed.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchCardFeed.tsx):**
  * Removed `<Trophy>` icon next to winning players in floor judge match cards.

### 1.8 Tiebreaker Games & `(t)` Notation
* **[types.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/types.ts):**
  * Added `hasTiebreaker?: boolean;` to `MatchScoreRecord`.
* **[MatchScoreDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchScoreDrawer.tsx):**
  * Added `+ Add Tiebreaker Game` button below the games list.
  * Added visual badge `Tiebreaker` on games beyond `bestOf`.
  * Displays tie detection notice when tied games exist.
* Series score display across bracket views:
  * In [BracketVisualizer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketVisualizer.tsx), [MatchCardFeed.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchCardFeed.tsx), and [OrganizerSheetMatrix.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/OrganizerSheetMatrix.tsx):
    * If `hasTiebreaker` is true or recorded games exceed `bestOf`, series scores render with `(t)` notation (e.g., `3 (t)` vs `1 (t)`).

### 1.9 Game Score Clearing & 0-0 Handling
* **[store.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/store.tsx):**
  * Added `saveMatchScores` method to tournament store:
    * Cleans scored games: empty entries or `0-0` scores with no declared winner are stored as nulls and excluded from win calculations.
    * Automatically calculates series wins for Player 1 and Player 2.
    * If neither player reaches the required win threshold $\lceil \text{best\_of} / 2 \rceil$, any previously declared winner is retracted using `retractMatchWinner`, clearing downstream bracket slots.
    * Preserves `hasTiebreaker` flag on the match record.
* **[MatchScoreDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchScoreDrawer.tsx):**
  * Clearing points or entering `0-0` automatically unselects any declared winner.

### 1.10 Lock & Unlock Buttons in Tournament Settings
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Added Phase & Bracket Lock Banner at the top of Tournament Settings:
    * When unlocked: displays `Brackets Unlocked (Draft Mode)` with **Lock Brackets and Begin Match Play** button (opens `VerifyBracketModal`).
    * When locked: displays `Brackets Locked (Match Play Active)` with **Unlock Brackets** button (calls `unlockBrackets` with error notification handling).

---

## 2. Automated Test Results

* **Vitest (`npm test`):** **11 test suites passed**, **80 tests passed** (0 failures).
  * `standings.test.ts`:
    * ✓ retains country and playstyle metadata for bracket players and non-bracket qualifiers in standings
    * ✓ correctly derives 1st, 2nd, 3rd/4th placements from completed bracket matches
    * ✓ accurately calculates rank delta between qualifier rank and final rank
  * `advance.test.ts`:
    * ✓ clears match winner/loser and downstream feeder slot on retraction
    * ✓ cascades retraction if downstream match had also declared a winner
* **TypeScript (`npm run typecheck`):** `tsc --noEmit` passed with 0 errors.
* **ESLint (`npm run lint`):** `eslint .` passed with 0 warnings.
* **Production Build (`npm run build`):** Vite bundle compiled successfully in 2.73s.

---

## 3. Manual Verification Steps

1. **Clearable Number Inputs:**
   - Go to **Create Tournament** -> select **Average of X Attempts**. Backspace the number until empty; verify it stays empty without jumping to 2. Click outside the input: verify validation error and refocus.
   - Go to **Tournament Settings** -> edit any numeric input (Min Score, Points, Tier Player Count). Verify clearable backspacing and blur validation.
2. **Dropdown Carats:**
   - In **Tournament Settings**, inspect the **Bracket Type** dropdown or any other native `<select>`. Verify the chevron carat has comfortable right padding (`0.75rem`), identical to the Best-of dropdown.
3. **Standings Country & Playstyle Chips:**
   - In **Final Standings**, verify players who competed in brackets (including the champion, runner-up, and early eliminations) show their country flag and playstyle badge alongside qualifier-only players.
4. **Player Profile Drawer Interactions:**
   - In **Bracket** visualizer, hover over a player name box: verify gold border highlight on the player box only. Click the player name: verify `PlayerDetailDrawer` opens.
   - Hover on the rest of the match card: verify the match card highlights. Click: verify `MatchScoreDrawer` opens.
   - Test the same in **Organizer Sheet** and **Floor Judge** views.
   - In **Final Standings** and **Settings -> Tournament Roster**, click a competitor name: verify `PlayerDetailDrawer` opens.
5. **Tiebreaker Games & `(t)` Notation:**
   - Open any match in **Bracket** view. Click **+ Add Tiebreaker Game**. Score the tiebreaker game and click **Save**.
   - Verify the score displays with `(t)` on the bracket (e.g. `3 (t) - 1 (t)`).
6. **Score Clearing & Winner Retraction:**
   - Open a completed match, clear game scores or set to `0-0`. Save the match: verify the winner is retracted and downstream bracket slots are cleared.
7. **Lock & Unlock in Settings:**
   - In **Tournament Settings**, locate the Phase & Bracket Lock Banner at the top. Click **Lock Brackets and Begin Match Play** to verify brackets; click **Unlock Brackets** to return to draft mode.
