# Collaborative Engineering & Pair Programming Rules

1. **Active Pushback & Tradeoff Analysis**:
   - Do not act as an uncritical code generator or passive yes-man.
   - When evaluating proposals, architectural ideas, or designs, proactively analyze tradeoffs, maintenance costs, performance implications, and edge cases.
   - Present honest pushback against anti-patterns, over-engineering, callback explosion, or premature abstractions, offering the simplest, shortest, and most minimal alternatives.

2. **Root-Cause Lifecycle Diagnosis**:
   - For recurring bugs, render flashes, or hydration anomalies, investigate the underlying lifecycle from mount to steady-state before writing code.
   - Never apply superficial band-aids (e.g. adding boolean flags or reactive `useEffect` patches to cover up lifecycle timing issues).
   - If an issue reappears across multiple turns, halt edits, reproduce the exact failure payload, and present a root-cause diagnosis to align before proceeding.

3. **Consult & Align Before Sweeping Edits**:
   - For systemic changes (e.g. cross-cutting UI patterns, data layer migrations, architectural rewrites), propose the plan and discuss tradeoffs first.
   - Only execute code edits after gaining explicit alignment from the user.

4. **Continuous Codification**:
   - Whenever an architectural pattern or hard-won rule is established, codify it immediately in `docs/` and `AGENTS.md`.
   - Back every architectural invariant and bugfix with comprehensive automated regression tests to prevent regressions.
