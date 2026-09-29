# Testing and Bug Prevention Rules

Whenever resolving a bug or addressing an issue reported by the user:
1. **Mandatory Regression Tests**: Always write dedicated, comprehensive regression tests that reproduce the reported failure scenario and assert the correct behavior.
2. **Never Skip Regression Tests**: No bug fix is considered complete without passing regression tests that prevent the issue from reoccurring.
3. **Cover Edge Cases**: Include tests for edge cases such as tier transitions, stage and round filter combinations, key collision prevention, and bracket format variants (Single Elimination, Traditional Double Elimination, Flat Staged Double Elimination, Accelerated Hybrid).
