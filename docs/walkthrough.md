# Walkthrough: Priority 5 (Global Player Pool Directory & Tournament Roster)

Priority 5 (Commits 5.1 & 5.2) is complete and verified across all automated test suites (68 passing tests), typechecking, linting, and production builds.

---

## 1. Summary of Changes

### 1.1 Commit 5.1: Global Player Pool Directory (`classic_tetris_global_players` & `/players` Route)
* **[store.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/store.tsx):**
  * Storage Key: strictly configured with `const GLOBAL_PLAYERS_STORAGE_KEY = 'classic_tetris_global_players'`.
  * Initialized and persisted `globalPlayers: PlayerProfile[]` in LocalStorage.
  * Added global catalog operations: `addGlobalPlayer`, `updateGlobalPlayer`, `deleteGlobalPlayer`, `clearAllGlobalPlayers`, and `generateFakeGlobalPlayers`.
  * Synced `addPlayerToPool` so any newly created competitor in qualifier entry automatically populates the master catalog.
* **[simulation.ts](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/simulation.ts):**
  * Implemented `generateAdditionalFakePlayers(count, existingPool)`:
    * Generates the exact requested count of simulated players.
    * Deduplicates against existing player pool names.
    * Generates realistic competitor profiles: name, country code, playstyle (`Rolling`, `DAS`, `Hypertap`), and personal bests (700,000–1,350,000).
    * Provides automatic fallback naming (`Player X`) if the predefined names catalog is exhausted.
* **[GenerateFakePlayersModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/players/components/GenerateFakePlayersModal.tsx):**
  * Prompts for count of players to generate.
  * Numeric input (default: 16, min: 1, max: 200).
  * Quick increment preset buttons: `+8`, `+16`, `+32`, `+64`.
  * Clear "OK" and "Cancel" buttons.
  * Backdrop click dismissal disabled.
* **[PlayerEditModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/players/components/PlayerEditModal.tsx):**
  * Modal for adding or editing competitor profiles in the global catalog.
  * Fields: Name (with unique validation), Country (2-letter code), Personal Best (manual input, never auto-mutated), Playstyle selector, Notes, and Disqualification toggle.
  * Backdrop click dismissal disabled.
* **[PlayerDirectory.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/players/components/PlayerDirectory.tsx):**
  * Summary Analytics Cards: Total Global Competitors, Playstyle Breakdown (`Rolling`, `DAS`, `Hypertap`), Highest Personal Best, Average Personal Best.
  * Search Bar (filters name, country, notes).
  * Playstyle filter pills (`All Styles`, `Rolling`, `DAS`, `Hypertap`, `Disqualified`).
  * Sort dropdown (`PB High to Low`, `PB Low to High`, `Name A–Z`, `Country`).
  * Master Player Table: Index, Competitor (with avatar and ID), Country badge, Playstyle badge, Personal Best (with MAXOUT badge for $\ge 1,000,000$), Status, Notes, Edit and Delete actions.
  * Speedbump modals for single player deletion and catalog purge.
* **[PlayerDirectoryPage.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/routes/PlayerDirectoryPage.tsx):**
  * Dedicated global catalog route at `/players` with global top navbar and navigation link back to Tournaments.
* **[App.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/App.tsx):**
  * Added route `/players` preceding dynamic `/:slug` routes.
* **[TournamentNavbar.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/components/TournamentNavbar.tsx) & [TournamentSwitcherPage.tsx](file:///Users/jgrondski/src/routes/TournamentSwitcherPage.tsx):**
  * Added navigation buttons to access the Global Player Pool from any view.

### 1.2 Commit 5.2: Tournament Roster Management & Registration
* **[ImportFromGlobalModal.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/players/components/ImportFromGlobalModal.tsx):**
  * Allows tournament organizers to browse available competitors from `classic_tetris_global_players` not yet in the tournament roster.
  * Features search filtering, "Select All" / "Deselect All", individual checkboxes, and batch import.
  * Backdrop click dismissal disabled.
* **[TournamentAdminForm.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/tournament/components/TournamentAdminForm.tsx):**
  * Added **Section 3: Tournament Roster**:
    * Capacity summary cards: Registered Competitors, Total Bracket Capacity, and Roster Status badge (`Underfilled (X/Y)`, `Full Capacity (X/X)`, or `Ready (X in tiers + Z DNQ)`).
    * Action buttons: "Import from Global Pool", "Import All Available ({count})", and "+ Register Competitor".
    * Searchable registered competitor table with details and "Remove" action.
    * Safe competitor removal guard: prevents removing any competitor who has recorded matches, alerting the organizer to clear match scores first.
* **[CreatablePlayerSelect.tsx](file:///Users/jgrondski/src/repos/tournament-manager/src/features/qualifiers/components/CreatablePlayerSelect.tsx):**
  * Combobox now accepts `globalPlayers` and provides distinct suggestions:
    * In-tournament competitors.
    * Available global catalog competitors with an `+ Import` indicator.
    * Selecting a global competitor automatically imports them into the tournament roster.
* **[QualifierEntryModal.tsx](file:///Users/jgrondski/src/features/qualifiers/components/QualifierEntryModal.tsx):**
  * Connected `globalPlayers` and auto-importing to `CreatablePlayerSelect`.

---

## 2. Automated Test Results

* **Vitest (`npm test`):** 10 test files passed, **68 tests passed** (0 failures).
  * **[NEW]** `players.test.ts`:
    * ✓ Generates the exact count of new competitors requested with valid fields and unique IDs.
    * ✓ Does not duplicate existing competitor names in the pool.
    * ✓ Generates fallback `Player X` names when predefined names are exhausted.
    * ✓ Deduplicates players when importing from global pool into tournament roster.
    * ✓ Safely handles competitor removal: allows unplayed competitors, blocks match participants.
* **TypeScript (`npm run typecheck`):** `tsc --noEmit` passed with 0 errors.
* **ESLint (`npm run lint`):** `eslint .` passed with 0 warnings.
* **Vite Production Build (`npm run build`):** Built successfully in 3.07s.

---

## 3. Manual Testing Verification

You can test these enhancements directly in your browser (`http://localhost:5173`):
1. **Global Player Pool (`/players`):**
   * Click **Global Player Pool** on the home page or from the top bar in any tournament.
   * Click **Generate Fake Players**:
     * Verify the modal prompts for the count (default 16).
     * Try presets (`+8`, `+16`, `+32`, `+64`) or enter a custom count.
     * Click **OK**: verify 16 simulated players appear in the table with avatars, countries, playstyles, PBs, and notes.
   * Search for a player name in the search box (e.g. "Scuti") and verify filtering.
   * Click **Add Competitor**: fill in name, country, PB, playstyle, and save.
2. **Tournament Roster Management (`/:slug/manage/settings`):**
   * Navigate to tournament settings and scroll down to **Section 3: Tournament Roster**.
   * View the capacity status card (e.g. `Underfilled`, `Full`, or `Ready with DNQ`).
   * Click **Import from Global Pool**: select competitors with checkboxes or use "Select All" and import them into the tournament roster.
   * Click **Register Competitor** to add a player directly to the tournament roster.
   * Try removing an unplayed player (removes cleanly). If match scores exist for that player, verify the guard prevents removal.
3. **Qualifier Entry with Global Suggestions (`/:slug/manage/qualifiers`):**
   * Click **Record Qualifier Attempt**.
   * In the competitor combobox, type a name that exists in the global catalog but not yet in the tournament.
   * Notice the "From Global Player Pool" section with `+ Import`. Selecting them automatically registers them into the tournament!
