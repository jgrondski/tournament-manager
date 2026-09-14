# Walkthrough: Bracketless Tournament Creation & Adaptive Qual Board

This update implements the workflow where new tournaments are created with zero initial brackets or tiers, allowing organizers to register competitors and log qualifier submissions immediately on a pure **qual board**. Once bracket tiers are created in Settings, the full **bracket-seeding leaderboard view** activates seamlessly.

---

## 1. Summary of Changes

### 1.1 Zero Initial Brackets on Tournament Creation
* **File:** [TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/TournamentSwitcherPage.tsx)
* **Change:**
  * Removed default generation of Gold & Silver tiers and mock seed players upon tournament creation (`tiers: []`).
  * Updated tournament cards on the home page:
    * Displays competitor count from `playersPool` instead of seeded bracket counts when `tiers.length === 0`.
    * Replaces tier badges with a subtle *"No bracket tiers configured (Qualifiers open)"* notice.
    * Makes **🏆 Qualifiers** the primary action button (`btn-primary`) when no brackets exist.
    * Safely links Sheet, Bracket, and Judge buttons to Settings or graceful fallback states.

### 1.2 Graceful Routing & Tierless Navigation
* **Files:**
  * [SlugRedirectPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/SlugRedirectPage.tsx)
  * [TournamentNavbar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/components/TournamentNavbar.tsx)
  * [ManageSheetPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/ManageSheetPage.tsx)
  * [ManageJudgePage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/ManageJudgePage.tsx)
  * [PublicTierBracketPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/PublicTierBracketPage.tsx)
* **Change:**
  * Root tournament URL `/:slug` redirects directly to `/:slug/leaderboard` when `tiers.length === 0`, rather than failing looking for a nonexistent `/gold` tier.
  * In `TournamentNavbar`, if no tiers are configured, displays a `+ Add Bracket Tier in Settings` link in the tier sub-row.
  * In `ManageSheetPage`, `ManageJudgePage`, and `PublicTierBracketPage`, if accessed while no tiers exist, renders a friendly, styled empty state guiding the organizer to view Qualifiers or configure tiers in Settings.

### 1.3 Pure Qual Board vs. Full Tiered Leaderboard
* **Files:**
  * [scoring.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/scoring.ts)
  * [LeaderboardTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/LeaderboardTable.tsx)
  * [QualifierEntryModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/QualifierEntryModal.tsx)
* **Change:**
  * In `scoring.ts`: when `tournament.tiers.length === 0`, all ranked competitors have `isDNQ: false` (no cutoffs exist yet, so no player has missed qualification).
  * In `LeaderboardTable.tsx`:
    * When `tiers.length === 0` (no brackets made):
      * Renders as a pure **qual board**: Rank, Competitor, and Format Scores/Points.
      * Omit the **Bracket Seed** column (`<th>` and `<td>` removed).
      * Omit tier cutoff divider lines.
      * Omit tier background tinting (clean neutral alternating rows).
      * Displays an informative empty state if 0 competitors are registered yet.
    * When `tiers.length > 0` (brackets created):
      * Activates the full **current leaderboard view** with Bracket Seed column, tier cutoffs, and tier tints, regardless of whether qualifiers are open or locked.
  * In `QualifierEntryModal.tsx`:
    * Added a helpful empty-roster hint under the combobox: *"💡 Roster is currently empty. Type a player name above to register a competitor and record their score, or select from global pool."*

### 1.4 Standings Page for Bracketless Tournaments
* **Files:**
  * [standings.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/standings.ts)
  * [FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx)
* **Change:**
  * In `standings.ts`: when `tournament.tiers.length === 0`, all qualifier players are placed in global standings with `eliminationRound: 'Qualifier'`, `isDNQ: false`, ranked 1..N.
  * In `FinalStandingsTable.tsx`:
    * Renders a unified **"Qualifier Standings"** section rather than marking everyone as DNQ.
    * Added a banner: *"No bracket tiers have been created yet. Standings below reflect live qualifier rankings."* with a direct link to Settings.

---

## 2. Verification Results

### 2.1 Automated Tests
### 1.5 Bracketless Navigation & Standings Gating
* **Files:**
  * [TournamentNavbar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/components/TournamentNavbar.tsx)
  * [TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/TournamentSwitcherPage.tsx)
  * [PublicTierBracketPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/PublicTierBracketPage.tsx)
  * [FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx)
* **Change:**
  * In `TournamentNavbar` and `TournamentSwitcherPage`, clicking "Visual Bracket" when no tiers exist routes to `/:slug/bracket` instead of redirecting to Settings.
  * In `PublicTierBracketPage`, renders the exact empty state from the Organizer Sheet: title **"No Bracket Tiers Configured"** with buttons to `[🏆 View Qualifiers]` and `[⚙️ Configure Tiers in Settings]`.
  * In `FinalStandingsTable`, premature placement rankings (1st..Nth) and tournament statistics are hidden until qualifiers and brackets are finalized:
    * If `tiers.length === 0`: shows **"No Bracket Tiers Configured"** with redirect buttons to Qualifiers and Settings.
    * If `!isLocked`: shows **"Brackets Not Finalized"** with redirect buttons to Qualifiers, Visual Bracket, and Settings.

### 1.6 Decoupled Seeding & Reactive Bracket Population
* **Files:**
  * [simulation.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/simulation.ts)
  * [TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx)
* **Change:**
  * In `simulation.ts`: `generateSimulatedQualifiers` generates 25–30 competitors with qualifier attempts when `totalCapacity === 0`.
  * In `TournamentAdminForm.tsx`:
    * "Seed Qualifiers Only" is enabled regardless of whether brackets exist.
    * "Simulate Tournament" / "Simulate Matches" remains gated on bracket tiers existing.
    * When adding, modifying, or removing bracket tiers, `generateDraftBracketsForTournament` evaluates dynamically, immediately populating the newly created tiers with the top qualified competitors from the leaderboard.

---

## 2. Verification Results

### 2.1 Automated Tests
All 88 unit tests across 11 test suites pass:
```bash
npm test

 ✓ src/features/bracket/math/__tests__/traditional.test.ts (13 tests)
 ✓ src/features/bracket/math/__tests__/advance.test.ts (7 tests)
 ✓ src/features/bracket/math/__tests__/flat.test.ts (13 tests)
 ✓ src/features/tournament/__tests__/store.test.ts (3 tests)
 ✓ src/features/tournament/__tests__/standings.test.ts (8 tests)
 ✓ src/features/bracket/math/__tests__/round-overrides.test.ts (8 tests)
 ✓ src/features/players/__tests__/players.test.ts (5 tests)
 ✓ src/features/tournament/__tests__/simulation.test.ts (9 tests)
 ✓ src/features/qualifiers/__tests__/scoring.test.ts (14 tests)
 ✓ src/features/tournament/__tests__/verification.test.ts (4 tests)
 ✓ src/features/bracket/__tests__/colorUtils.test.ts (4 tests)

 Test Files  11 passed (11)
      Tests  88 passed (88)
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
# ✓ 1902 modules transformed.
# ✓ built in 2.94s
```

---

## 3. Qualifier State Management, Modal Enhancements, & Navigation Realignment

1. **Top Qualifier Score Form in Player Profile Drawer**:
   - [PlayerDetailDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/PlayerDetailDrawer.tsx): When qualifiers are open, the score entry form and judge verification toggle are at the very top of the drawer body.
2. **Blank Player Selection & Auto-Filter in Qualifier Entry Modal**:
   - [QualifierEntryModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/QualifierEntryModal.tsx), [CreatablePlayerSelect.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/CreatablePlayerSelect.tsx): Starts blank, auto-filters matching competitors as typed, includes clear button (`X`), and displays status with judge verify button upon player selection.
3. **3-State Qualifier Status Engine & Judge Verification**:
   - [scoring.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/scoring.ts): Logic-based states: `'not started'` (0 attempts), `'in progress'` (1+ attempts), and `'verified'` (judge verified).
   - [LeaderboardTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/LeaderboardTable.tsx): Status badges rendered for each row on the Qual Board.
4. **Auto-Flip to "Verified" on Bracket Lock**:
   - [store.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/store.tsx): When brackets are finalized and locked, all players are auto-flipped to `isVerified: true`.
5. **Restored "Import All Available" from Global Pool**:
   - [ManageTournamentPlayersPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/ManageTournamentPlayersPage.tsx): Added `Import All Available ({count})` button in both header toolbar and empty roster card.
6. **Navigation Bar Realignment**:
   - [TournamentNavbar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/components/TournamentNavbar.tsx):
     - Left aligned: Organizer Sheet, Floor Judge, Visual Bracket.
     - Right aligned: Qualifiers, Standings, Register Players, Settings.
     - Tier tabs rendered on dedicated sub-bar for bracket views.
