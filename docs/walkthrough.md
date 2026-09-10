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

### 1.7 Admin Form Dirty State Tracking & Discard ([TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx))
* Real-time deep comparison of form state (`name`, `slug`, `date`, `location`, `qualFormat`, `qualAverageCount`, `qualsClosed`, `pointsConfig`, `tiers`) against initial tournament values to produce `isDirty: boolean`.
* Live status indicator in the bottom bar: shows `"All changes saved"` in green or `"Unsaved changes in configuration"` in amber.
* Added **"Discard Changes"** button next to Save Configuration: reverts all form fields back to saved tournament state. Disabled when `!isDirty`.
* Disabled **"Save Configuration"** button when `!isDirty` (`disabled={!isDirty}`).
* Hooked browser `window.addEventListener('beforeunload')` to warn if the tab is refreshed or closed while unsaved changes exist.

### 1.8 Unsaved Changes Navigation Guard ([ManageTournamentSettingsPage.tsx](../src/routes/ManageTournamentSettingsPage.tsx) & [TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx))
* `TournamentNavbar` now supports `onNavigate?: (url: string) => boolean | void`.
* All internal navigation links (logo, tournament switcher dropdown items, dynamic tier tabs, view switcher tabs) are hooked through `handleLinkClick` / `handleDropdownNavigate`.
* When navigating away from settings with unsaved changes (`isDirty`), navigation is intercepted and triggers an in-app speedbump modal:
  * Modal header: **"Unsaved Changes"**
  * Warning message: *"You have unsaved changes in tournament settings. If you leave this page now, your changes will be discarded."*
  * Actions: **"Stay"** (remains on settings page) and **"Discard & Leave"** (proceeds to target destination).
  * Backdrop click dismissal is disabled per the safety invariant.

### 1.9 Qualifier Entry Score Input Guard ([QualifierEntryModal.tsx](../src/features/qualifiers/components/QualifierEntryModal.tsx))
* Computed `isScoreValid = Boolean(selectedPlayer) && !isNaN(numericScore) && numericScore > 0`.
* Submit button is strictly disabled (`disabled={!isScoreValid}`) until both a competitor is selected and a valid positive score (`> 0`) is entered.
* Form submit handler will not submit 0, negative, or invalid score attempts.

### 1.10 Dynamic Tier Color Bindings ([BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx), [MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx), [OrganizerSheetMatrix.tsx](../src/features/bracket/components/OrganizerSheetMatrix.tsx), [FinalStandingsTable.tsx](../src/features/tournament/components/FinalStandingsTable.tsx), [TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx))
* Created utility [`colorWithAlpha`](../src/features/bracket/colorUtils.ts) to safely generate RGBA colors with custom alpha transparency from any 3- or 6-digit hex code.
* **[OrganizerSheetMatrix.tsx](../src/features/bracket/components/OrganizerSheetMatrix.tsx):**
  * Sticky round divider banners dynamically colored and bordered with `tier.primaryColor`.
  * Match # badges dynamically tinted and bordered with `tier.primaryColor`.
  * Live status tags and live telemetry text dynamically styled with `tier.primaryColor`.
  * Winning matchup rows, series score values, and trophy icons dynamically colored with `tier.primaryColor`.
  * Winning individual game score cells dynamically highlighted with `tier.primaryColor`.
  * Match row hover highlight tinted with `tier.primaryColor`.
* **[TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx):**
  * Bracket name tabs inherit `tier.primaryColor` with a color indicator pip, themed borders, and full active color illumination (`tier.primaryColor`).
* **[FinalStandingsTable.tsx](../src/features/tournament/components/FinalStandingsTable.tsx):**
  * Tier selector pills dynamically inherit each tier's `t.primaryColor` with color pips, active borders, and background tints.
* **[TournamentSwitcherPage.tsx](../src/routes/TournamentSwitcherPage.tsx):**
  * Tier pills on tournament cards dynamically inherit each tier's `t.primaryColor` with color pips, tinted backgrounds, and colored labels.
* **[BracketVisualizer.tsx](../src/features/bracket/components/BracketVisualizer.tsx):**
  * Round header badges, in-progress match glows, winning matchup slots, and champion banner dynamically styled with `tier.primaryColor`.
* **[MatchCardFeed.tsx](../src/features/bracket/components/MatchCardFeed.tsx):**
  * Active round tab, match badges, in-progress live badges, winning slots, and trophy icon dynamically styled with `tier.primaryColor`.

### 1.11 Global Space Unselected Bracket State ([TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx))
* In global views (`settings`, `leaderboard`, `standings`), the navbar distinguishes bracket-specific views (`bracket`, `sheet`, `judge`) from global spaces.
* When on any global page, `isTierActive` evaluates to `false` for all bracket tabs, preventing any bracket (e.g. Gold) from appearing as selected when viewing global settings or standings.

---

## 2. Automated Test Results

* **Vitest:** 8 test files passed, 46 tests passing (0 failures).
* **TypeScript:** `tsc --noEmit` passed with 0 errors.
* **ESLint:** `eslint .` passed with 0 errors.

---

## 3. Manual Testing Checklist

You can test these changes in your running dev server (`http://localhost:5173`):

### A. Dynamic Tier Colors across Organizer Sheet, Navbar & Switcher
1. In Settings (`/:slug/manage/settings`), set Tier 1 (Gold) to `#eab308` and Tier 2 (Silver) to `#3b82f6`.
2. Visit the **Organizer Sheet** for Tier 2 (`/:slug/manage/sheet?tier=silver`):
   - **Expected:** Round divider headers, match # badges, live tags, winning player rows, winning game score boxes, and hover highlights reflect Silver's blue (`#3b82f6`).
3. Switch to Tier 1:
   - **Expected:** All elements update to Gold's amber/gold (`#eab308`).
4. Look at the **Navbar Tier Tabs**:
   - **Expected:** Each tab has a color indicator pip matching its tier color. The active tier tab glows and is bordered in its respective color.
5. Check the **Tournament Landing Page** (`/`):
   - **Expected:** Tier badges on tournament cards have color pips and tinted borders matching their primary colors.

### B. Global Space Bracket Unselected State
1. While on the Visual Bracket (`/:slug/:tierSlug`), observe that the active tier tab (e.g. "Gold") is highlighted.
2. Click **"⚙️ Settings"**:
   - **Expected:** You navigate to Settings. In the top navbar, **none of the bracket tabs (Gold, Silver, etc.) are highlighted as selected**.
3. Click **"🏆 Qualifiers"** or **"🏅 Standings"**:
   - **Expected:** In both global views, none of the bracket tabs are highlighted as selected.
4. Click any bracket tab (e.g. "Silver"):
   - **Expected:** You navigate back into the bracket view, and "Silver" is now highlighted as active.

### C. Admin Form Dirty State & Discard
1. In Settings, edit any field. Verify the status changes to `"Unsaved changes in configuration"`.
2. Click **"Discard Changes"**: verify all fields revert and the status changes to `"All changes saved"`.

### D. Unsaved Changes Navigation Guard
1. In Settings, make an edit and click any navbar link.
2. Verify the "Unsaved Changes" modal opens, backdrop click dismissal is blocked, and "Stay" vs "Discard & Leave" works as expected.


