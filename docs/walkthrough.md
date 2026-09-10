# Walkthrough: Commit 2.2 (Data Management & Simulation Controls in Settings)

Commit 2.2 has been implemented and enhanced based on feedback. Validated against the full test suite (53 tests across 9 test files), linter, and typechecker.

---

## 1. Summary of Changes

### 1.1 Non-Mutually-Exclusive Simulation Controls
* **Fresh State (`0 qualifiers`, `0 matches`):**
  * **"Seed Qualifiers Only"**: Enabled. Generates realistic competitors and qualifier attempts in draft mode.
  * **"Seed & Simulate Tournament"**: Enabled. Seeds qualifiers, locks brackets, and plays all matches to tier champions.
* **Seeded State (`qualifiers > 0`, `0 matches`):**
  * **"Seed Qualifiers Only"**: Disabled with tooltip: *"Qualifiers have already been seeded. Clear qualifier scores to re-seed."*
  * **"Simulate Matches"**: **Enabled!** Takes the currently seeded qualifiers, calculates and locks brackets, and plays all matches to tier champions.
* **Completed State (`matches > 0`):**
  * Both buttons disabled with informative tooltips indicating that scores must be cleared to re-run.

### 1.2 Instant State Sync & In-Form Tier Persistence
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Extracted `saveCurrentConfig()` which regenerates bracket structures and persists tiers to the store.
  * `handleSeedQualifiers` and `handleSimulate` automatically run `saveCurrentConfig()` if the form is dirty, ensuring newly created or modified bracket tiers are saved and simulated immediately without requiring a page refresh or manual save.
  * Form `tiers` state is synchronized with regenerated brackets (`setTiers(updatedTiers)`).
  * Modal clear actions display immediate user-facing feedback banners.
* **[store.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/store.tsx):**
  * Updated `clearQualifierScores` to safely reset `isLocked` to `false` and unlock tiers if no recorded matches exist.
* **[simulation.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/simulation.ts):**
  * In `runFullSimulation(tournament)`, `generateDraftBracketsForTournament` is always called before locking, ensuring that existing seeded qualifiers properly build the match brackets before match play is simulated.

---

## 2. Automated Test Results

* **Vitest (`npm test`):** 9 test files passed, 53 tests passing (0 failures).
  * Added unit test in `simulation.test.ts`: *"simulates matches from already-seeded qualifiers without regenerating submissions"*.
* **TypeScript (`npm run typecheck`):** `tsc --noEmit` passed with 0 errors.
* **ESLint (`npm run lint`):** `eslint .` passed with 0 warnings and 0 errors.

---

## 3. Manual Testing Verification

You can test these controls directly in your browser (`http://localhost:5173`):

### A. Two-Step Seeding & Match Simulation
1. Navigate to a tournament Settings page (`/:slug/manage/settings`).
2. Click **"Clear All Tournament Data"** (confirm modal).
3. Observe:
   - Button 1 is **"Seed Qualifiers Only"** (Enabled).
   - Button 2 is **"Seed & Simulate Tournament"** (Enabled).
4. Click **"Seed Qualifiers Only"**:
   - "Qualifier Attempts" increments.
   - Button 1 becomes disabled.
   - Button 2 switches to **"Simulate Matches"** and **remains enabled!**
5. Click **"Simulate Matches"**:
   - "Recorded Matches" populates.
   - Tournament locks into Match Play Mode.
   - Matches tab shows completed round-by-round results.

### B. Clean Slate Bracket Deletion & Re-creation
1. Click **"Clear All Tournament Data"** (confirm modal).
2. Delete all existing tiers via the trash icons.
3. Click **"+ Add First Bracket Tier"** to create a fresh tier.
4. Observe:
   - "Seed Qualifiers Only" and "Seed & Simulate Tournament" are **immediately enabled** without requiring a page refresh!
5. Click **"Seed & Simulate Tournament"**:
   - The newly created tier is automatically saved and simulated cleanly.
