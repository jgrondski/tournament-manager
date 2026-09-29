# Workspace Guidelines

## Bug Fixes & Regression Testing
- **Mandatory Regression Tests**: Whenever fixing a bug or addressing a regression reported by the user, always write comprehensive automated regression tests.
- **Verification**: Verify that the regression tests fail on the buggy behavior and pass with the fix.
- **Scope**: Ensure coverage across all supported bracket types (Single, Double Elimination variants: Traditional, Flat Staged, Accelerated Hybrid), filter interactions, and tier-switching states.
