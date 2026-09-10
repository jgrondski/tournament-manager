# Walkthrough: Commit 2.1 (Unify Lifecycle to `isLocked`, Clean Slate Defaults & Purge Legacy Reset Demo)

Commit 2.1 has been implemented and validated against the full test suite, linter, and typechecker.

---

## 1. Summary of Changes

### 1.1 Single Source of Truth: `isLocked: boolean`
* **[types.ts](../src/features/tournament/types.ts):** Replaced legacy `isVerified: boolean` and `qualsClosed: boolean` with a single source of truth:
  ```ts
  isLocked: boolean; // false = Qualifiers Mode (Draft Preview), true = Match Play Mode (Locked)
  ```
* **[mock-data.ts](../src/features/tournament/mock-data.ts):** Updated mock tournaments to use `isLocked: true` (for `kc-2026-open`) and `isLocked: false` (for `kc-2026-das`).
* **[store.tsx](../src/features/tournament/store.tsx):**
  * Renamed action `verifyBrackets(tournamentId)` to **`lockTournament(tournamentId)`**.
  * Locking sets `isLocked: true` on both the tournament and all of its tiers.
  * In `unlockBrackets(tournamentId)`: enforced the safety invariant. Unlock is blocked if `matchScores` contains any recorded games, series wins, or completions, returning:
    ```
    Cannot unlock: Match play has begun. Clear recorded scores before unlocking.
    ```
  * Removed legacy `setQualifiersClosed`.
  * Removed legacy `resetTournamentData` demo reset function from context type, implementation, and provider.
  * Updated storage key to `tournament_manager_tournaments_v3` with backwards-compatible migration from `ctwc_tournaments_v3`.

### 1.2 Clean Slate Defaults & Zero-Tournament Fresh Onboarding
* **[store.tsx](../src/features/tournament/store.tsx):**
  * On a fresh install with no existing LocalStorage data, initial tournament state defaults to `[]` (0 tournaments).
  * `createTournament` initializes clean slate defaults:
    * `playersPool: []` (empty roster)
    * `qualifierSubmissions: []` (no score attempts)
    * `tournamentPlayers: {}`
    * `matchScores: {}`
    * `isLocked: false` (Qualifiers Mode)
* **[TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx):**
  * When `tournaments.length === 0`, displays a clean, prominent empty state inviting the user to click **"+ Create New Tournament"**.
  * In the create modal, the CTA button is titled **"Create & Configure"**.
  * On modal submission, the user is navigated directly to `/:slug/manage/settings`.
  * Removed backdrop click dismissal on the Create Tournament modal overlay per the modal safety invariant.
  * Rebranded footer copy to: *"Tournament Manager • LocalStorage Enabled • OBS Broadcast Ready"*.

### 1.3 Purged "Reset Demo" Button & Updated Badges
* **[TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx):**
  * Removed the legacy **"Reset Demo"** button and `RotateCcw` icon from the top toolbar.
  * Mode badge evaluates `tournament.isLocked`:
    * `!tournament.isLocked`: `QUALIFIERS MODE` (amber badge)
    * `tournament.isLocked`: `MATCH PLAY MODE` (green badge)
* **[VerifyBracketModal.tsx](../src/features/tournament/components/VerifyBracketModal.tsx):**
  * Calls `lockTournament(tournament.id)`.
* **[TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx):**
  * Removed the retired `qualsClosed` state, setter, dirty comparison, and save payload.
  * Replaced the toggle button with a Tournament Mode status card reflecting `tournament.isLocked`.
* **[scoring.ts](../src/features/qualifiers/scoring.ts) & [LeaderboardTable.tsx](../src/features/qualifiers/components/LeaderboardTable.tsx):**
  * In `scoring.ts`, qualifier completion now evaluates `tournament.isLocked || Boolean(tPlayer?.qualsCompleted)`.
  * In `LeaderboardTable.tsx`, displays `"Qualifiers Closed (Match Play in Progress)"` when locked, and disables the `+ Submit Score` button with a helpful tooltip.
* **[BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx), [MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx), [OrganizerSheetMatrix.tsx](../src/features/bracket/components/OrganizerSheetMatrix.tsx):**
  * Updated all match card interactive click handlers and cursor pointer guards from `tournament.isVerified` to `tournament.isLocked`.

---

## 2. Automated Test Results

* **Vitest:** 8 test files passed, 47 tests passing (0 failures).
* **TypeScript:** `tsc --noEmit` passed with 0 errors.
* **ESLint:** `eslint .` passed with 0 errors.

---

## 3. Manual Testing Checklist

You can test these changes in your running dev server (`http://localhost:5173`):

### A. Fresh 0-Tournament Onboarding
1. Open the browser console and run: `localStorage.clear(); location.reload();`.
2. Observe the landing page:
   - **Expected:** The landing page renders a clean empty state: *"No Tournaments Created Yet"*, with a "+ Create New Tournament" button.
3. Click **"+ Create New Tournament"**:
   - Fill in Tournament Name: `Desert Classic 2026`.
   - Verify modal CTA says **"Create & Configure"**.
   - Click backdrop outside modal: **Expected:** Modal does not close.
   - Click **"Create & Configure"**:
   - **Expected:** You are redirected directly to `http://localhost:5173/desert-classic-2026/manage/settings`.
   - **Expected:** Tournament has 0 qualifier attempts and 0 match scores.

### B. Lifecycle Transition: Qualifiers Mode to Match Play Mode
1. In the top navbar, observe the status badge says **`QUALIFIERS MODE`** (amber).
2. Look at the top toolbar:
   - **Expected:** The legacy "Reset Demo" button is completely gone.
3. Go to the Visual Bracket (`/desert-classic-2026/gold`):
   - Notice the amber banner: *"QUALIFIERS MODE — Seeding preview active"*.
   - Click on any match card: **Expected:** Match cards cannot be opened.
4. Click **"Lock Brackets & Begin Match Play"**:
   - Confirm the lock modal.
   - **Expected:** Tournament transitions to **`MATCH PLAY MODE`** (green banner and navbar badge).
   - **Expected:** Match cards in Visual Bracket, Floor Judge, and Organizer Sheet are now clickable.

### C. Unlock Brackets Safety Invariant
1. Before any scores are entered, click **"Unlock Brackets"** in the banner:
   - **Expected:** Brackets safely unlock back to **`QUALIFIERS MODE`**.
2. Click **"Lock Brackets & Begin Match Play"** again to return to Match Play Mode.
3. Open any match card and record a game score (e.g. Game 1: 500,000 to 400,000) and save.
4. Now click **"Unlock Brackets"** in the banner:
   - **Expected:** Unlock is blocked! An error message displays: *"Cannot unlock: Match play has begun. Clear recorded scores before unlocking."*
5. Go to Settings -> Data Management, click **"Clear Match Scores"**, and confirm the speedbump modal.
   - **Expected:** Match play is reset and brackets return to Qualifiers Mode.

### D. Qualifiers Page Lockdown
1. Lock brackets into Match Play Mode.
2. Go to Qualifiers (`/leaderboard`):
   - **Expected:** Header reads *"Qualifiers Closed (Match Play in Progress)"*.
   - **Expected:** "+ Submit Score" button is disabled.


