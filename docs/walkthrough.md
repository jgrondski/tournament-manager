# Walkthrough: Priority 3 (Global Standings & Competitive Intra-Round Exit Tiebreaker)

Priority 3 (Commits 3.1 & 3.2) is complete and verified across all automated test suites (59 passing tests), typechecking, linting, and production builds.

---

## 1. Summary of Changes

### 1.1 Commit 3.1: Competitive Intra-Round Exit Tiebreaker Engine
* **[standings.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/standings.ts):**
  * Implemented `calculateGlobalStandings(tournament: Tournament): GlobalStandingRow[]`.
  * Implemented exact mathematical 5-tier exit tiebreaker hierarchy for competitors eliminated in the same bracket round:
    1. **`exit_game_wins` descending:** Competitors winning more games in their elimination match rank higher (e.g. 2–3 > 1–3 > 0–3).
    2. **`avg_loss_score` descending:** Average score across lost games in the exit match.
       * *Forfeit rule:* Unplayed games required to reach the win threshold count as score 0.
    3. **Overall tournament match record net:** `matchesWon - matchesLost` across all tournament play.
    4. **Overall tournament game score average:** Average game score across all tournament match play.
    5. **Initial qualifying seed ascending:** `a.seed - b.seed` fallback.
  * Multi-tier sequential #1 to #N numbering:
    * Tier 1 (Gold) -> Tier 2 (Silver begins at `Gold Capacity + 1`, e.g. #9) -> Tier 3 (Bronze) -> DNQ (ranked by qualifier score) -> Disqualified ('DQ' at bottom).
  * Calculated `qualRank` and `rankDelta = qualRank - finalRank` (+ delta = outperformed qualifying seed, - delta = underperformed).

### 1.2 Commit 3.2: Unified Global Standings Table & Analytics UI
* **[FinalStandingsTable.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/FinalStandingsTable.tsx):**
  * Replaced isolated tier tab switching with a single continuous #1 to #N global table matching the qualifiers leaderboard styling.
  * **Header Metric Cards:**
    * 🏆 Tournament Champion (with highlight glow and undefeated banner)
    * 👥 Total Competitors
    * ⚔️ Completed Matches
    * 🎮 Tournament Tiers
  * **Quick Filter & Search Controls:**
    * Instant search filtering across competitor names, country, playstyle, and tier.
    * Section filter pills: All Standings, Gold Championship, Silver Bracket, DNQ, Disqualified with live counts.
  * **Section Divider Headers:**
    * Distinctive colored divider headers for each tier (inheriting the tier's primary color with subtle glow), DNQ section, and Disqualified section.
  * **Rich Analytics Columns:**
    * **Placement / Rank:** 1st Place (Gold Trophy), 2nd Place (Silver Medal), 3rd Place (Bronze Award), Tier Champions (custom tier color banner), #N ordinals, and DQ badges.
    * **Competitor:** Name, country tag, playstyle pill (`DAS`, `Rolling`, `Hypertap`), and bracket seed.
    * **Qual & Delta:** Initial qualifying seed, qual score, and rank delta badge (`↑ +X` emerald green, `↓ -X` rose red, `— 0` neutral).
    * **Stage Reached:** Highest round achieved (Champion, Finals, Semifinals, Quarterfinals, Round of 16, DNQ, Disqualified).
    * **Exit Match / Loss Avg:** Exact elimination match score (e.g. `2–3 vs OpponentName`), forfeit indicators, and formatted average loss score.
    * **Match Record:** `W–L` tournament match play record.
    * **Game Record:** `W–L` game score record.
    * **Game Score Average:** Tabular formatted average score across all played games.

---

## 2. Automated Test Results

* **Vitest (`npm test`):** 9 test files passed, 59 tests passed (0 failures).
  * `standings.test.ts`:
    * ✓ Correctly derives 1st, 2nd, 3rd/4th placements from completed bracket matches.
    * ✓ Breaks ties between round losers using exit game wins (1–2 vs 0–2).
    * ✓ Breaks ties using avg_loss_score when exit game wins tie.
    * ✓ Penalizes forfeit unplayed games as score 0 in avg_loss_score.
    * ✓ Falls back to initial qualifying seed when all earlier tiebreakers tie.
    * ✓ Ranks Tier 1, then Tier 2 starting at Tier 1 count + 1, followed by DNQ and DQ.
    * ✓ Correctly calculates qualRank and rankDelta.
* **TypeScript (`npm run typecheck`):** `tsc --noEmit` passed with 0 errors.
* **ESLint (`npm run lint`):** `eslint .` passed with 0 warnings and 0 errors.
* **Vite Production Build (`npm run build`):** Built in 2.79s with 0 errors.

---

## 3. Manual Testing Verification

You can test the new standings table directly in your browser (`http://localhost:5173`):
1. Navigate to any tournament's **Standings** tab (`/:slug/standings`).
2. If the tournament was simulated via Settings (**"Seed & Simulate Tournament"** or **"Simulate Matches"**):
   * Notice the top metric cards showing the Tournament Champion, Total Competitors, Completed Matches, and Tiers.
   * Observe the unified #1 to #N table with Tier 1 (Gold), followed by Tier 2 (Silver starting at #9 or Gold count + 1), followed by DNQ competitors.
   * Check the **Qual & Delta** column: competitors who outperformed their seed display a green `↑ +X` badge; those who underperformed display a red `↓ -X` badge.
   * Check the **Exit Match / Loss Avg** column: displays the exact match score (e.g. `2–3 vs Opponent`) and average loss score used to break intra-round elimination ties.
   * Use the filter pills at the top to filter between "All Standings", "Gold Bracket", "Silver Bracket", or "DNQ".
   * Test the search bar to filter by player name, country, or playstyle.
