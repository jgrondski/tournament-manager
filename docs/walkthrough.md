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
   - **Generous Default Window Height**: Configured `minHeight: '520px'` (and `maxHeight: '85vh'`, `flex: 1` content container) so the modal opens at a comfortable, spacious height even when no player is selected yet.
   - **Search Pop-over Expansion**: Increased the dropdown search list's `maxHeight` to `340px` with enhanced elevated drop-shadows, ensuring 6–8 competitors are visible at a glance without awkward vertical scroll clipping or squishing.
   - Added a helpful visual guidance card when no player is selected, prompting the user to search or pick a competitor.
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

---

## 4. Operational Polish, Competitor Journey Highlighting & Accelerated Hybrid Layout

### 4.1 Match Drawer Isolation & Design Consistency
* **Files:**
  * [MatchScoreDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchScoreDrawer.tsx)
  * [MatchupBanner.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/drawer/MatchupBanner.tsx)
  * [MatchTelemetryModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/MatchTelemetryModal.tsx)
* **Changes:**
  * **Accent Gradient Bar Isolation**: Constrained the top accent gradient line to the exact width of `MatchScoreDrawer`, preventing horizontal bleed across the rest of the screen.
  * **Header & Action Bar Solid Surfaces**: Updated the drawer title header and footer action bar (Save/Cancel buttons) to solid elevated backgrounds (`var(--color-bg-surface-elevated)`), matching individual game score cards and removing distracting gradient clutter.
  * **Matchup Banner Gradient Preservation**: Separated the score/matchup portion of the header from the title header, preserving the rich gradient background specifically for the series score display.
  * **Telemetry Modal Decluttering**: Removed "first to" labels and player playstyle chips from the read-only spectator match telemetry modal.

### 4.2 Tournament Settings Ergonomics & Header Telemetry
* **Files:**
  * [OrgBrandPaletteSection.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/settings/OrgBrandPaletteSection.tsx)
  * [BracketThemeEditor.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketThemeEditor.tsx)
  * [RoundOverridesEditor.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/RoundOverridesEditor.tsx)
  * [TournamentInfoSection.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/settings/TournamentInfoSection.tsx)
* **Changes:**
  * **Inline Theme Controls**: Aligned the "Apply" button directly on the same line as the "Inherit Organizational Theme" checkbox.
  * **Empty Overrides Banner Removal**: Removed the empty "No Round Specific Best of overrides" notification banner when no overrides are configured.
  * **Header Metrics Telemetry**: Right-aligned "Qualifier Attempts" and "Recorded Matches" telemetry badges in the settings header and removed redundant description text to save vertical space.

### 4.3 Search Competitor Input Unification
* **Files:**
  * [FinalStandingsPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/FinalStandingsPage.tsx)
  * [PublicLeaderboardPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/PublicLeaderboardPage.tsx)
* **Changes:**
  * Unified input size, font size, padding, search icon alignment, and layout container styling across both the Final Standings and Qualifiers Leaderboard views for visual harmony.

### 4.4 Bracket Competitor Search & Synchronized Player Journey Highlighting
* **Files:**
  * [BracketTierBar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketTierBar.tsx)
  * [BracketMatchCard.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/visualizer/BracketMatchCard.tsx)
  * [journeyHighlight.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/journeyHighlight.ts)
* **Changes:**
  * **Interactive Bracket Search**: Integrated a player search input with auto-complete suggestions into the visual bracket toolbar (`BracketTierBar`).
  * **Automatic Journey Illumination**: When a player is selected or the search resolves to a single unique competitor, the bracket automatically activates `highlightedPlayerId`, illuminating that competitor's path through all rounds, matches, and connecting lines while dimming non-relevant matches. Clearing the search restores standard viewing.
  * **Hover Blip Removal**: Removed the legacy competitor name hover color change blip in `BracketMatchCard.tsx` that previously clashed with player journey highlighting.
  * **Synchronized State Transitions**: Harmonized CSS transition timings across connecting lines, card borders, card backgrounds, and dimmed elements for instant, lag-free state flipping.

### 4.5 Accelerated Hybrid Pod Layout & View Mode Ergonomics
* **Files:**
  * [hybridLayout.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/layout/hybridLayout.ts)
  * [BracketQualifierPodGrid.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/visualizer/BracketQualifierPodGrid.tsx)
  * [BracketVisualizer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketVisualizer.tsx)
  * [BracketTierBar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/components/BracketTierBar.tsx)
  * [routingChips.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/bracket/routingChips.tsx)
  * [index.css](file:///Users/jgrondski/src/repos/tournament-manager/src/index.css)
* **Changes:**
  * **Pod Dimensions & Spacing**:
    * Pod 1 (Accelerated Round) compacted with 50% breathing room to eliminate internal scrollbars.
    * Pod 2 (Upper Bracket) fills remaining canvas with reduced margins, permitting scroll only when matches overlap pod boundaries.
    * Aligned Lower Bracket routing chips with the Lower Bracket palette (`#10B981` / emerald borders and badges).
  * **Multi-View Pod Layout**:
    * **Fit View (`viewMode = 'fit'`)**: Places Pod 3 (Lower Bracket) horizontally to the right of Pod 1 and Pod 2 (arranging Pod 1 $\rightarrow$ Pod 2 $\rightarrow$ Pod 3 side-by-side).
    * **Split View (`viewMode = 'split'`)**: Also puts Pod 3 to the right of Pod 2 side-by-side. Enabled the "Split Wings" view mode toggle in `BracketTierBar` for Accelerated Hybrid tiers.
    * **Standard View (`viewMode = 'standard'`)**: Retains the classic stacked layout (Top row: Pod 1 & Pod 2; Bottom row: Pod 3).
  * **Pod 2 Scrollbar Elimination in Fit View**:
    * Grown Pod 2 container minimum width by 24px and updated `combinedBounds` to calculate true side-by-side dimensions (~2760px $\times$ ~895px) for the `fitScale` transform engine.
    * Set `overflowX: effectiveObsView === 'fit' ? 'hidden' : 'auto'` on Pod 2 and Pod 3 containers.
  * **Pod 3 Match Centering**:
    * Reduced Pod 3 horizontal canvas padding to 12px and round gap to 36px in `calculateAcceleratedHybridLowerBracketLayout`, compacting width to ~1172px.
    * Centered matches horizontally with `<div style={{ width: 'fit-content', minWidth: 'max-content', margin: '0 auto' }}>`, ensuring equal left and right margins across all views while preserving left-aligned scrolling on smaller screens.
  * **Responsive Collapse**:
    * Added `.qualifier-side-by-side-pods` to the `@media (max-width: 1024px)` media query in `index.css`.

