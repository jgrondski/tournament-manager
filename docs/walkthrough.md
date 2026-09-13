# Walkthrough: Profile Reorder, Standings & Qualifier Styling, Points Chips & Simulation Scaling

This update implements 5 user-requested improvements across player profiles, tournament standings, qualifier leaderboards, and simulation scoring.

---

## 1. Summary of Changes

### 1.1 Player Profile Layout Reordering
* **File:** [PlayerDetailDrawer.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/PlayerDetailDrawer.tsx)
* **Change:**
  * Reordered the drawer sections so **Bracket Match Play Record** appears directly beneath the Competitor Profile grid.
  * Moved **Qual Submissions Audit Log** (along with the "Log Attempt" action button) to the very bottom of the page.

### 1.2 Standings Page Placement Colors & Visible Row Separators
* **File:** [FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx)
* **Change:**
  * Added tier-colored background tinting to all standings rows (Gold rows receive gold tint, Silver rows receive silver tint, etc.), matching the qualifiers leaderboard styling.
  * Replaced the low-contrast row border (`#1e293b`) with a much darker, crisp separator: `1px solid rgba(0, 0, 0, 0.65)`.

### 1.3 Qualifiers Leaderboard Visible Row Separators
* **File:** [LeaderboardTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/LeaderboardTable.tsx)
* **Change:**
  * Darkened the row separator border in the qualifiers leaderboard table from `#1a253a` to `1px solid rgba(0, 0, 0, 0.65)`.
  * Rows and tier groups now have clear, distinct separation even over dark and tinted backgrounds.

### 1.4 Points Qual Sheet: Only Show Points-Bearing Chips
* **File:** [LeaderboardTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/LeaderboardTable.tsx)
* **Change:**
  * Filtered points breakdown chips to only render attempts that earned points:
    ```tsx
    const nonZeroPoints = ptsResult.pointsPerAttempt.filter(pts => pts > 0);
    ```
  * Submissions with 0 points (or non-point attempts) no longer clutter the qualifier table with `+0` chips.

### 1.5 Simulation: Occasional High Points (60s and 70s) for Top Players
* **File:** [simulation.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/simulation.ts)
* **Change:**
  * Configured `playerTargetAttempts` for points-based qualifying:
    * Top seeds simulate 4 to 6 qualifying attempts (instead of being limited to 2-3).
    * Introduced an occasional "legendary points run" (~18% chance for seed 1, ~8% chance for seeds 2-3) generating 6 to 7 attempts.
    * Score generation for these high runs scales up to 2,150,000, triggering the highest tier thresholds (9 to 13 points per attempt).
    * Total points for top performers now occasionally reach the 60s and 70s, accurately mirroring competitive high-tier point tournaments while remaining rare.

---

## 2. Verification Results

### 2.1 Automated Tests
All 85 tests across 11 test suites pass:
```bash
npm test

 ✓ src/features/bracket/math/__tests__/advance.test.ts (7 tests)
 ✓ src/features/bracket/math/__tests__/traditional.test.ts (13 tests)
 ✓ src/features/tournament/__tests__/store.test.ts (3 tests)
 ✓ src/features/bracket/math/__tests__/flat.test.ts (13 tests)
 ✓ src/features/tournament/__tests__/standings.test.ts (8 tests)
 ✓ src/features/bracket/math/__tests__/round-overrides.test.ts (8 tests)
 ✓ src/features/players/__tests__/players.test.ts (5 tests)
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
# ✓ built in 3.05s
```
