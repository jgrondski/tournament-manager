# Workspace Guidelines: Tournament Manager Operational Handbook

## 1. Collaborative Engineering & Architectural Consultation
- **Active Pushback & Tradeoff Analysis**: Do not act as an uncritical code generator. When evaluating architectural decisions or proposed patterns, proactively identify risks, failure modes, and long-term maintenance costs (e.g., callback explosion, unnecessary indirection, premature abstractions). Offer balanced pushback and simpler alternatives.
- **Root-Cause Lifecycle Diagnosis**: For recurring bugs, hydration issues, or rendering anomalies, trace the complete data and component lifecycle from cold mount to steady state. Strictly avoid band-aids (such as adding more boolean flags or reactive `useEffect` patches).
- **Consult Before Sweeping Execution**: When addressing systemic or multi-file issues, propose the architectural design first, debate tradeoffs with the user, and gain explicit alignment before touching files.
- **Continuous Codification**: Once an architectural agreement is reached (e.g., 3-Tier UI Pattern, storage policies), immediately codify it in `docs/` and `AGENTS.md`, backed by automated regression tests to prevent backsliding.

## 2. Bug Fixes & Regression Testing
- **Mandatory Regression Tests**: Whenever fixing a bug or addressing a regression reported by the user, always write comprehensive automated regression tests.
- **Investigate Structural Root Causes**: Investigate the underlying structural failure rather than treating the symptom. If an issue resurfaces more than once, halt code edits, reproduce the exact failure payload, and present a root-cause diagnosis before making further changes.
- **Verification**: Verify that the regression tests fail on the buggy behavior and pass with the fix.
- **Scope**: Ensure coverage across all supported bracket types (Single, Double Elimination variants: Traditional, Flat Staged, Accelerated Hybrid), filter interactions, and tier-switching states.

## 3. Operating Environment & Cross-Platform Compatibility
- **Cross-Platform Parity**: Code and scripts MUST run identically on Windows (PowerShell) and macOS/Linux (Bash/Zsh).
- **Paths**: Never compare `import.meta.url === file://${process.argv[1]}` directly (fails on Windows slashes). Always normalize paths with `.replace(/\\/g, '/')`.
- **Database Connection**: Docker PostgreSQL runs on port 5433 (`POSTGRES_PORT=5433` in `.env`). Standalone Node scripts must invoke `process.loadEnvFile()` if `process.env.DATABASE_URL` is empty. Never hardcode port 5432.
- **Shell Syntax**: Avoid bash-specific pipes (`||`, `&&`, `rm -rf`, `export`) in instructions intended for PowerShell. Keep npm scripts cross-platform.

## 4. Token & Credit Efficiency Rules (Agent Ergonomics)
- **NO Headless Browser Subagents**: DO NOT spin up browser subagents or automated browser sessions unless the user explicitly requests it. They burn credits and timeout. Rely on focused `vitest` tests.
- **Zero Tests on Documentation**: For changes that are purely markdown (`.md`), comments, or docstrings, DO NOT run tests, builds, or typechecks.
- **Targeted Test Execution**: During active coding, run ONLY the relevant test file (e.g. `npx vitest run src/path/to/test.ts`). Reserve full `npm test` for final completion.
- **Typecheck over Full Lint Dump**: Use `npm run typecheck` (`tsc --noEmit`) for code correctness. Avoid full `npm run lint` dumps as pre-existing `no-explicit-any` warnings waste context tokens.
- **Respect Active Processes**: Check active terminal metadata before starting dev servers or DB studios to prevent port collisions (`npm run dev` and `npm run db:studio` are often already running).

## 5. Database & Drizzle Relational Invariants
- **Mock DB vs. Real Postgres**: `vitest` runs in `pg-mem`. Passing unit tests DO NOT guarantee Postgres migration parity. Schema changes in `src/db/schema.ts` MUST be validated by running `npm run db:push` against real Docker PostgreSQL.
- **Naming Parity**:
  - `bracket_tiers.num_players` (SQL) maps to `tier.playerCount` in TS. Support both defensively.
  - Bracket routing supports both `'TRADITIONAL_TREE'` and `'TRADITIONAL'`.
- **Foreign Keys**: Never alter primary key types (UUID <-> Text) in Drizzle without verifying existing foreign key cascades.

## 6. Universal Tournament Mathematical Invariants
- **Bye Rule**: Byes are NEVER represented as playable matches. Total matches: strictly $N - 1$ (Single Elim) or $2N - 2$ / $2N - 1$ (Double Elim).
- **Alternating Bye Pairing**: Highest seeds must receive byes and face lowest surviving seeds ($1 \text{ vs } N, 2 \text{ vs } N-1$). Never pair sequential seeds for byes ($1 \text{ vs } 2$).
- **Double Elim Drops**: Bye recipients losing in Winners R2 drop to Losers R2, never Losers R1.
- **Points Qual Tiebreaker**: Players with 0 points are deterministically tiebroken by highest single game score (`peakScore`).
- **Data Lifecycle Safety**:
  - Unlocking brackets (`isLocked = false`) is forbidden if any match scores exist.
  - Clearing qualifiers is forbidden if match scores exist (require "Clear Matches" first).

## 7. UI & State Hygiene
- **3-Tier Component Pattern**: Follow `docs/UI_ARCHITECTURE.md`:
  - Tier 1: Route Gate (Container). Only reads params/store, renders LoadingScreen/NotFound. ZERO form state, ZERO `useEffect`s. Passes resolved entities with `key={entity.id}`.
  - Tier 2: Keyed Feature View (`key={entity.id}`). Owns ephemeral layout/modal/dirty state. Automatically resets state on remount. ZERO `useEffect`s for resetting state.
  - Tier 3: Pure Presentational Leaf Components. Driven purely by props & callbacks.
- **Anti-`useEffect` Mandate**: Never use `useEffect` to reset state when an ID changes (use `key={id}`), to sync URL params, or to compute derived values. `useEffect` is only for external browser API sync.
- **Modals & Drawers**: Backdrop/scrim clicks MUST NEVER dismiss dialogs or score drawers (`onClick={onClose}` on backdrops is prohibited). Dismissal requires explicit Cancel/Save/X.
- **Country Flags**: Country codes MUST be 2-letter uppercase ISO 3166-1 alpha-2 strings. Always provide a safe fallback icon for null or unknown countries.
- **Tier Switching & Navigation**: Tab/tier selection must be driven by URL params (`?tier=slug`), never `sessionStorage`. Multi-tier feeds (`MatchCardFeed`) must use `key={tier.id}` to guarantee clean remounting without stale state.
- **Competitor Name Trimming**: Database enforces `lower(trim(name))` uniqueness. Always trim names before queries/inserts.

## 8. Primary Verification Commands
- `npm run test:brackets` — Fast, targeted bracket math & visualizer tests (~1-2s).
- `npm run test:api` — Relational database & backend API middleware tests (~3-5s).
- `npm run test:ui` — Component, form, drawer, and navigation tests (~2-3s).
- `npx vitest run <file>` — Single file unit test during development.
- `npm run typecheck` — TypeScript check (`tsc --noEmit`).
- `npm test` — Full regression test suite (run at milestone completion).
- `npm run db:push` — Validate schema against real PostgreSQL.
- `npm run db:seed` — Standalone CLI seeder for orgs, authentic competitors, and sample tournaments.

## 9. Domain File Map & Architecture Index
- **Bracket Engine & Math**:
  - `src/features/bracket/math/` — Bracket generation math (`traditional.ts`, `flat.ts`, `double-elimination.ts`, `advance.ts`, `overrides.ts`).
  - `src/features/bracket/components/` — Visualizers (`BracketVisualizer.tsx`, `OrganizerSheetMatrix.tsx`, `MatchCardFeed.tsx`, `MatchScoreDrawer.tsx`).
  - `src/features/bracket/colorUtils.ts` — 5-color bracket themer and contrast algorithms.
- **Tournament State & Domain Hooks**:
  - `src/features/tournament/store.tsx` — Root React Context provider (`TournamentProvider`, `useTournament`).
  - `src/features/tournament/hooks/` — Focused domain hooks (`useTournamentSettings`, `useQualifiers`, `useMatches`, `useGlobalPlayers`).
  - `src/features/tournament/defaults.ts` — Canonical entity factories (`createEmptyTournament`, `createDefaultTier`, `createEmptyPlayer`).
  - `src/features/tournament/types.ts` — Canonical domain models & strict interfaces.
- **Qualifiers & Standings**:
  - `src/features/qualifiers/scoring.ts` — Scoring hierarchy, tiebreakers, rank derivation, bracket draft distribution.
  - `src/features/qualifiers/components/` — Leaderboard & drawers (`LeaderboardTable.tsx`, `PlayerDetailDrawer.tsx`, `QualifierEntryModal.tsx`).
  - `src/features/tournament/standings.ts` — Intra-round exit tiebreakers and final standings table.
- **Relational Database & Backend API**:
  - `src/db/schema.ts` — Drizzle PostgreSQL relational schemas & cascading foreign keys.
  - `src/server/api.ts` — Vite dev server REST middleware (`/api/health`, `/api/tournaments`, `/api/players`, `/api/simulate/sample`).
  - `src/api/` — Typed DB query operations (`tournaments.ts`, `players.ts`, `qualifiers.ts`, `brackets.ts`, `organizations.ts`).
  - `scripts/seed.ts` — Standalone database CLI seeder (`npm run db:seed`).

## 10. Access Security & Multi-Tier PIN Routing Invariants
- **Public Friction-Zero Access:** Public routes (`/:slug/brackets`, `/:slug/quals`, `/:slug/standings`, `/:slug/qualify`, OBS overlays) are strictly read-only and open to everyone without login prompts.
- **Route Gating & Auto-Redirects:** Any unauthenticated attempt to access `/manage/*` or global admin views (`/organizations`, `/players`) auto-redirects to the public tournament view.
- **Tournament Admin Scope:** Tournament-level PIN unlocks management left-nav for that tournament only (`/:slug/manage/*`). Unauthorized navigation to global admin views redirects back to the tournament management dashboard.
- **Master Admin & Recovery PIN:** Master PIN grants global access across all tournaments, organizations, and competitors. An immutable `MASTER_ADMIN_RECOVERY_PIN` environment variable acts as a permanent failsafe.
- **Data Management & Simulation Isolation:** Destructive data management and simulation controls ("Clear All Tournament Data", "Simulate Full Tournament", "Seed Qualifiers Only") and corresponding API endpoints (`/api/simulate/sample`, bulk reset operations) are strictly restricted to Master/System Admins. Tournament Admins cannot view, access, or trigger simulation or data wipe actions.
- **Encrypted at Rest:** Tournament PINs are encrypted via AES-256-GCM (`pinCrypto.ts`), allowing Master Admins to safely reveal them (`👁️ 7492`) without disrupting active sessions.
- **API Mutation Protection:** All mutation endpoints (`POST`, `PUT`, `DELETE`) require `Authorization: Bearer <sessionToken>` and enforce role/tournament scope.

