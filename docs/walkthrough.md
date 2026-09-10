# Walkthrough: Commit 1.1 (UI Rebranding, Mode Terminology & Modal Guards)

Commit 1.1 has been implemented and validated against the test suite and typechecker.

---

## 1. Summary of Changes

### 1.1 UI Rebranding to "Tournament Manager"
* **[index.html](../index.html):** Updated document `<title>` from `Tetris Tournament Manager` to `Tournament Manager`.
* **[src/index.css](../src/index.css):** Updated color palette header comment to `/* Color Palette - Dark Slate & Gold Theme */`.
* **[TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx):** Replaced `CTWC TOURNAMENT MANAGER` brand header with `TOURNAMENT MANAGER`. Updated subtitle copy to `"for competitive gaming tournaments"`.
* **[TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx):** Replaced `CTWC MANAGER` with `TOURNAMENT MANAGER`.

### 1.2 Mode Terminology Updates
* Replaced legacy `"Draft Preview"` / `"DRAFT"` with **`QUALIFIERS MODE`** across navigation badges, switcher cards, and banner headers.
* Replaced legacy `"VERIFIED"` with **`MATCH PLAY MODE`** across navigation badges, switcher cards, and banner headers.
* **[BracketDraftBanner.tsx](../src/features/bracket/components/BracketDraftBanner.tsx):**
  * Banner now reads: *"QUALIFIERS MODE — Seeding preview active. Click 'Lock Brackets & Begin Match Play' to start matches."*
  * Button text updated to: *"Lock Brackets & Begin Match Play"*.
  * Active banner updated to: *"MATCH PLAY MODE • Match play and score entry active"*.
* **[VerifyBracketModal.tsx](../src/features/tournament/components/VerifyBracketModal.tsx):**
  * Header updated to: *"Lock Brackets & Begin Match Play — Double-confirmation seed freeze"*.
  * Confirmation dialog updated to explain transitioning the tournament to Match Play Mode.

### 1.3 Modal & Drawer Dismissal Safety Invariant
* **[MatchScoreDrawer.tsx](../src/features/bracket/components/MatchScoreDrawer.tsx):** Removed backdrop click dismissal. The drawer will no longer close accidentally when clicking the dark background overlay outside the drawer panel. Dismissal requires clicking Cancel, Save, or the top-right `X` icon.
* **[QualifierEntryModal.tsx](../src/features/qualifiers/components/QualifierEntryModal.tsx):** Removed backdrop click dismissal. The modal remains open if the user clicks the dark background overlay outside the dialog panel. Dismissal requires clicking `X` or "Done".
* **[VerifyBracketModal.tsx](../src/features/tournament/components/VerifyBracketModal.tsx):** Removed backdrop click dismissal.

### 1.4 Match Card Lockdown Invariant
* **[BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx):** Added guard on match card nodes: `onClick` and `cursor: pointer` are enabled **only** when `tournament.isVerified` is true (Match Play Mode). During Qualifiers Mode, match cards are strictly non-clickable and show default cursor.
* **[MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx):** Updated badge to read `Qualifiers Mode` when locked.

### 1.5 Safe Tournament Deletion & Bracket Destruction
* **Landing Page Tournament Deletion ([TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx)):**
  * Added a Delete button on every tournament card on the landing page.
  * **Safety Check:** If a tournament contains recorded qualifier scores or match scores, the Delete button is disabled with a tooltip explaining that data must be cleared first in Settings.
  * **Speedbump Modal:** For tournaments without recorded scores (e.g. test tournaments), clicking Delete opens a speedbump confirmation modal requiring explicit confirmation. Backdrop dismissal is disabled.
* **Bracket Deletion & Zero-Bracket Support ([TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx)):**
  * Removed the restriction preventing deletion of the final bracket tier (`disabled={tiers.length <= 1}`).
  * Every bracket deletion triggers a speedbump confirmation modal, warning when deleting the final remaining tier.
  * Added a clean empty state when 0 brackets are configured with a CTA to add the first bracket.
  * Handled 0-tier tournaments safely across the switcher page to prevent runtime errors.

### 1.6 Data Management & Clearing Controls in Settings
* Added a dedicated **"Data Management"** section in [TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx):
  * **Summary Counters:** Live counts of Qualifier Attempts and Recorded Matches.
  * **Clear Match Scores:** Clears all recorded match scores, resetting match play and reverting brackets to Qualifiers Mode.
  * **Clear Qualifier Scores:** Empties the qualifier leaderboard submissions.
  * **Clear All Tournament Data:** Clears both qualifiers and match records back to a clean slate, resetting the tournament so it can be safely deleted on the landing page or re-seeded.
  * **Speedbump Modals:** Each clear action requires explicit user confirmation in a modal (with backdrop dismissal disabled).

---

## 2. Automated Test Results

* **Vitest:** 7 test files passed, 42 tests passing (0 failures).
* **TypeScript:** `tsc --noEmit` passed with 0 errors.
* **ESLint:** `eslint .` passed with 0 errors.

---

## 3. Manual Testing Checklist

You can test these changes in your running dev server (`http://localhost:5173`):

1. **Brand Rebranding:**
   - Check the browser tab title: it should read **"Tournament Manager"**.
   - Navigate to `/`: the top header reads **"TOURNAMENT MANAGER"**.
   - Navigate to any tournament (e.g. `/kc-2026-open/gold`): the top navbar reads **"TOURNAMENT MANAGER"**.
2. **Mode Terminology:**
   - In Qualifiers Mode (Draft), the navbar and banner show **`QUALIFIERS MODE`** in amber.
   - The banner button reads **"Lock Brackets & Begin Match Play"**.
   - Clicking the button opens the modal titled **"Lock Brackets & Begin Match Play"**.
3. **Backdrop Click Dismissal:**
   - In Qualifiers Mode, open the "Lock Brackets" modal. Click anywhere outside the dialog modal box on the dark background. **Expected:** Modal does *not* close.
   - Click the `X` button or "Cancel". **Expected:** Modal closes.
   - On `/manage/qualifiers`, click "+ Submit Qualifier Score". Click anywhere outside the modal dialog. **Expected:** Modal does *not* close.
4. **Match Card Lockdown:**
   - While in Qualifiers Mode, visit the Visual Bracket (`/:slug/:tierSlug`) and Judge Feed (`/:slug/manage/bracket`).
   - Hover over and click on match cards. **Expected:** Cards are not clickable, cursor is default, and score entry drawer does not open.
