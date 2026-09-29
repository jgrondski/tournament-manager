# Phase 6 Implementation Plan: Direct Seeding Engine & Bulk Import

This implementation plan details the architectural execution of **Phase 6: Direct / Manual Seeding & Roster Seeding Engine** as specified in the updated [SPEC.md / Tetris Tournament Manager.md](../Tetris%20Tournament%20Manager.md).

Phase 6 enables tournament organizers to seed tournaments **without requiring qualifier submissions**, supporting invitationals, pre-ranked community events, and blind-draw tournaments via direct manual ranking, multiline bulk import, and interactive drag-and-drop ordering.

---

## Master Roadmap Overview (Phases 1–10)

| Phase | Title | Status | Description |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Core Routing Engine | **Complete** | Mathematical Single-Elimination & Flat routing, bye invariants. |
| **Phase 2** | Reactive UI & Match Recording | **Complete** | Canvas visualizer, drawer score entry, multi-game tracking. |
| **Phase 3** | In-Memory Pipeline & Refinements | **Complete** | Mode unification (`isLocked`), global standings, maxout logic, global player pool (`classic_tetris_global_players`). |
| **Phase 4** | Tournament Organizations | **Complete** | Organization directory (`/organizations`), org branding & default rules inheritance, raw metric indexing. |
| **Phase 5** | Double Elimination Bracket Engine | **Complete** | Double elim (Winners, Losers, Grand Finals Reset), Accelerated Hybrid multi-pod engine, player journey search. |
| **Phase 6** | **Direct Seeding Engine & Bulk Import** | **Complete** | **Qual-less tournament seeding, multiline paste import, drag/drop reordering, tier boundary dividers, direct bracket generation.** |
| **Phase 7** | Relational Persistence & RBAC | Upcoming | Neon PostgreSQL + Drizzle ORM, role-based access control, serverless API endpoints, LocalStorage migration. |
| **Phase 8** | Online Qualifiers & Competitor Portal | Upcoming | Twitch OAuth 2.0, NES Authwords, session countdown timer, online judge review queue, Discord webhooks. |
| **Phase 9** | Match Data Export & Custom Analytics | Upcoming | Universal match data export (CSV/TSV/Excel), customizable field toggles and column ordering. |
| **Phase 10** | Production Deployment & Polish | Upcoming | Shared PIN security, Vercel edge deployment, custom domains. |

---

## User Requirements & Decisions Incorporated

> [!NOTE]
> 1. **Qual-less Tournaments:** Tournaments can operate with `seedingMethod: 'MANUAL'`, allowing organizers to seed brackets without logging any qualifier scores.
> 2. **Bulk Text Import:** Organizers can paste a raw multiline list of competitor names (e.g. copied from Google Sheets, Discord, or text files), with top seeds listed first. The parser strips common numbering (`1. `, `#1 `, bullets) and resolves players against the master global player pool.
> 3. **Interactive Reordering:** Support drag-and-drop handles, Move Up/Down/Top/Bottom buttons, direct numeric seed jumps, and random shuffle (for blind draw tournaments).
> 4. **Visual Tier Distribution:** Render colored tier cutoff dividers across the seed list (e.g. Gold Tier seeds 1–16, Silver Tier seeds 17–32, Reserves 33+).
> 5. **Bracket Generator Integration:** Mathematical bracket generators (`traditional`, `flat`, `double-elimination`, `accelerated-hybrid`) hook into `manualSeeds` directly when in manual mode.
> 6. **Mandatory Regression Tests:** In accordance with workspace rules ([AGENTS.md](../AGENTS.md)), test coverage across all supported bracket types (Single, Double Elimination: Traditional, Flat, Accelerated Hybrid), filter interactions, and tier-switching states.

---

## Scoped Commits & Execution Plan

### Priority 1: Data Contracts, Seeding Method Configuration & Store Actions

#### Commit 1.1: Seeding Method Types & Tournament Entity Extension
* **Objective:** Introduce `SeedingMethod = 'QUALIFIERS' | 'MANUAL'` and `manualSeeds: string[]` on `Tournament`.
* **Changes:**
  * [src/features/tournament/types.ts](../src/features/tournament/types.ts):
    * Add `export type SeedingMethod = 'QUALIFIERS' | 'MANUAL';`
    * Update `Tournament` interface:
      ```typescript
      seedingMethod: SeedingMethod; // default 'QUALIFIERS'
      manualSeeds?: string[];       // ordered array of playerIds: index 0 = Seed 1, index 1 = Seed 2, etc.
      ```
    * Update `TournamentPlayer` interface to ensure `seed?: number` is kept in sync.

#### Commit 1.2: Store Actions & TournamentAdminForm Toggle
* **Objective:** Add store mutations for manual seeding and add the Seeding Mode selector to Tournament Settings.
* **Changes:**
  * [src/features/tournament/store.tsx](../src/features/tournament/store.tsx):
    * Add action `setSeedingMethod(tournamentId: string, method: SeedingMethod)`: Updates `seedingMethod`, re-derives draft brackets.
    * Add action `setManualSeeds(tournamentId: string, playerIds: string[])`: Sets `manualSeeds` array, updates `tournamentPlayers[id].seed = index + 1`, re-derives draft brackets.
    * Add action `reorderManualSeed(tournamentId: string, fromIndex: number, toIndex: number)`: Swaps/shifts seeds, updates brackets.
    * Add action `shuffleManualSeeds(tournamentId: string)`: Randomizes seed order (Fisher-Yates shuffle), updates brackets.
  * [src/features/tournament/components/TournamentAdminForm.tsx](../src/features/tournament/components/TournamentAdminForm.tsx):
    * Add "Seeding Method" radio/toggle under Tournament Details:
      - **"Qualifiers Leaderboard"** (Standard: players log scores, leaderboard determines seeds).
      - **"Direct / Manual Seeding"** (Invitationals/Custom: organizer enters and orders seeds manually).
    * When "Direct / Manual Seeding" is active, collapse/hide qualifier-specific fields (`qualFormat`, `qualAverageCount`, `qualWindowMinutes`) and display an informational note explaining that brackets will be generated from the Seeding list.
    * Guard mode switching: disabled if tournament `isLocked`.

---

### Priority 2: Bulk Seed Import via Multiline Paste

#### Commit 2.1: Bulk Seed Import Modal & Parser
* **Objective:** Provide a fast, forgiving multiline paste modal for bulk importing participant lists ordered top seeds first.
* **Changes:**
  * **[NEW]** `src/features/tournament/components/seeding/BulkSeedImportModal.tsx`:
    * Large textarea with placeholder demonstrating acceptable formats:
      ```text
      1. Jonas Neubauer
      2. Harry Hong
      #3 Joseph Saelee
      DogPlayingTetris
      ```
    * Parsing Engine (`parseBulkSeedList(text: string): string[]`):
      * Strips numeric prefixes, periods, parentheses, hashes, dashes (e.g. `1. `, `1) `, `#1 `, `- `, `1 - `).
      * Trims whitespace, ignores empty lines, deduplicates within the pasted list with warning indicators.
    * Resolution Pipeline:
      * Matches names against existing tournament roster (`tournament.playersPool`).
      * If not on roster, matches against master global player catalog (`classic_tetris_global_players`) and imports profile metadata (country, playstyle, PB).
      * If completely new, auto-creates player in global catalog and adds to tournament roster.
    * Sets `manualSeeds` to the exact parsed order.
    * Modal telemetry summary: "Parsed X players (Y from global pool, Z newly created)".

---

### Priority 3: Interactive Seeding Manager & Tier Boundary Dividers

#### Commit 3.1: Interactive Seeding Manager UI (`ManualSeedingManager.tsx`)
* **Objective:** Build an intuitive, rich reordering interface for arranging participant seeds with drag-and-drop and button controls.
* **Changes:**
  * **[NEW]** `src/features/tournament/components/seeding/ManualSeedingManager.tsx`:
    * Ordered competitor list displaying:
      - Seed badge (`#1`, `#2`, ...)
      - Competitor name, country flag, and playstyle badge
      - Quick actions: Drag handle, "Move Up" (↑), "Move Down" (↓), "Set Seed #" (direct jump dialog), "Remove from Seeds" (✕).
    * Header action bar:
      - "+ Add Competitor" searchable autocomplete dropdown (pulls from global pool or registers new).
      - "Paste List / Bulk Import" button opening `BulkSeedImportModal`.
      - "Shuffle / Randomize" button with confirmation speedbump modal (for blind draw tournaments).
      - "Reverse Order" button.
      - "Clear All Seeds" button.

#### Commit 3.2: Dynamic Tier Boundary Dividers & Reserve Management
* **Objective:** Visually segment the manual seed list by tier capacities so organizers immediately see which players fall into Gold, Silver, Bronze, or Reserves.
* **Changes:**
  * In `ManualSeedingManager.tsx`:
    * Calculate running tier capacities based on `tournament.tiers` (sorted by priority).
    * Render colored banner dividers across the list:
      - Seeds 1 through $N_1$: **Tier 1 (e.g., Gold Bracket)** with `tier.primaryColor` accent.
      - Seeds $N_1 + 1$ through $N_1 + N_2$: **Tier 2 (e.g., Silver Bracket)** with `tier.primaryColor` accent.
      - Seeds $> \text{Total Bracket Capacity}$: **Reserves / Alternate Pool (Did Not Qualify)** with neutral styling.
    * Highlight empty seed slots if registered seeds are fewer than total bracket capacity.

---

### Priority 4: Mathematical Bracket Generation Hook & Navigation Realignment

#### Commit 4.1: Bracket Generator Direct Seeding Hook
* **Objective:** Direct bracket generation through `manualSeeds` when in manual mode, bypassing qualifier scores.
* **Changes:**
  * [src/features/qualifiers/scoring.ts](../src/features/qualifiers/scoring.ts):
    * Update `generateDraftBracketsForTournament(tournament: Tournament)`:
      ```typescript
      if (tournament.seedingMethod === 'MANUAL') {
        const manualIds = tournament.manualSeeds || [];
        const playerMap = new Map((tournament.playersPool || []).map(p => [p.id, p]));
        
        let seedOffset = 0;
        return sortedTiers.map(tier => {
          const tierCapacity = tier.numPlayers;
          const tierPlayerIds = manualIds.slice(seedOffset, seedOffset + tierCapacity);
          seedOffset += tierCapacity;

          const seededPlayers: SeededPlayer[] = tierPlayerIds.map((id, idx) => {
            const p = playerMap.get(id);
            return {
              id,
              name: p?.name || 'Unknown',
              seed: idx + 1, // Tier-normalized seed (1..capacity)
              country: p?.country,
              playstyle: p?.playstyle,
            };
          });

          // Generate bracket if >= 2 players
          if (seededPlayers.length >= 2) {
            return generateTierBracket(tier, seededPlayers);
          }
          return { ...tier, bracket: null };
        });
      }
      ```
    * Instant reactive recalculation across visual bracket tree, card feeds, and sheet matrices.

#### Commit 4.2: Adaptive Navbar & Routing
* **Objective:** Dynamically adapt navigation tabs and routes based on `seedingMethod`.
* **Changes:**
  * [src/components/TournamentNavbar.tsx](../src/components/TournamentNavbar.tsx) & [src/components/TournamentSidebar.tsx](../src/components/TournamentSidebar.tsx):
    * When `tournament.seedingMethod === 'MANUAL'`, the "Qualifiers" navigation link dynamically re-labels to **"Seeding"** (`/:slug/manage/seeding`).
    * Public navigation: If tournament is in manual mode, public spectator navbar shows "Seeding" instead of "Qualifiers Leaderboard".
  * [src/routes/PublicLeaderboardPage.tsx](../src/routes/PublicLeaderboardPage.tsx):
    * When `tournament.seedingMethod === 'MANUAL'`, render the clean read-only Seeding & Tier Cutoff board (or redirect/toggle to `ManualSeedingManager`).
  * [src/App.tsx](../src/App.tsx):
    * Add route `/:slug/manage/seeding` and alias `/:slug/seeding`.

---

### Priority 5: Standings Integration, Simulation Controls & Automated Regression Testing

#### Commit 5.1: Standings Integration & Simulation Sandbox Adaptation
* **Objective:** Ensure final standings and simulation controls function seamlessly with manual seeds.
* **Changes:**
  * [src/features/tournament/standings.ts](../src/features/tournament/standings.ts):
    * In `calculateGlobalStandings`, check `tournament.seedingMethod`:
      - If `MANUAL`, initial seed is taken directly from `manualSeeds` index + 1.
      - `rankDelta = initialSeed - finalRank` displays over/underperformance relative to assigned manual seed.
  * [src/features/tournament/simulation.ts](../src/features/tournament/simulation.ts):
    * When `seedingMethod === 'MANUAL'`, "Seed Qualifiers Only" button in Settings changes label to "Generate Simulated Seeding", populating `manualSeeds` with realistic competitors.
    * "Simulate Full Tournament" simulates match play directly from the manual seeds.

#### Commit 5.2: Comprehensive Regression Test Suite
* **Objective:** Build robust automated regression tests verifying manual seeding across all bracket types and invariants.
* **Changes:**
  * **[NEW]** `src/features/tournament/__tests__/manualSeeding.test.ts`:
    * Test 1: Multiline parser handles leading numbers (`1. `, `#1 `, bullets), whitespace, and duplicates.
    * Test 2: Global player pool resolution automatically imports known players and registers new ones.
    * Test 3: Single-elimination Traditional bracket generates correct pairings from manual seeds (Seed 1 vs 16, 2 vs 15, etc.).
    * Test 4: Flat bracket generates correct round 1 and bye placements from manual seeds.
    * Test 5: Double-elimination bracket (Traditional & Flat) generates correct Winners and Losers drop brackets from manual seeds.
    * Test 6: Accelerated Hybrid multi-pod bracket routes Pod 1 (seeds 1–16) and Pod 2 (seeds 17–48) strictly from manual seeds.
    * Test 7: Multi-tier cutoff normalization: Tier 1 gets seeds 1–16 (normalized 1..16), Tier 2 gets seeds 17–32 (normalized 1..16).
    * Test 8: Reordering manual seeds reactively updates downstream bracket match nodes.
    * Test 9: Standings calculation produces correct sequential ranks and rank deltas from manual seeds.
    * Test 10: Safety lock invariant: manual seed reordering is strictly blocked when `isLocked === true`.

---

## Verification & Acceptance Checklist

- [x] A tournament can be configured with `seedingMethod: 'MANUAL'` in Settings.
- [x] Multiline paste into `BulkSeedImportModal` parses names cleanly and resolves against the global player pool.
- [x] Drag-and-drop and up/down reordering in `ManualSeedingManager` instantly updates bracket previews.
- [x] Tier dividers visually demarcate Gold, Silver, and Reserves.
- [x] Brackets generate correctly across Single Elim, Double Elim, Flat, and Accelerated Hybrid without any qualifier scores.
- [x] Final standings compute accurate rank deltas against manual seeds.
- [x] All automated unit and regression tests pass with zero type errors.
