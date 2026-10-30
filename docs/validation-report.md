# AlphaMix MVP Validation Report

Validation date: 2026-10-31  
Status: automated and HTTP integration verification passed

## Evidence table

| Requirement | Test or evidence | Status |
| --- | --- | --- |
| Fader change affects optimization | HTTP comparison produced a maximum allocation delta of 6.26%p | Passed |
| Enabled weights total 100% | Backend normalization and frontend unit tests | Passed |
| Zero total weight is rejected | HTTP 400 with `ZERO_AGENT_WEIGHT`; frontend alert test | Passed |
| Input/output schema validation | Pydantic validation and API contract tests | Passed |
| Optimization errors are handled | Infeasible cap and risk requests return structured errors | Passed |
| Mandatory constraints hold | Solver constraints plus post-solve assertions, including zero Risk Agent influence | Passed |
| Unsourced AI claims are warned | Critic missing-source test | Passed |
| Portfolio totals 100% | HTTP results: 1.0 and 0.9999999999999999 | Passed |
| Mock results are reproducible | Fixed assumptions and repeat-run equality tests | Passed |

## Final test runs

Executed from a clean source state with dependencies installed:

```text
backend> python -m pytest -q
.................. [100%]
18 passed

frontend> npm test
Test Files  2 passed (2)
Tests       6 passed (6)

frontend> npm run build
TypeScript project build and Vite production build succeeded
```

The HTTP smoke test confirmed:

- six Agent analyses and an approved Critic result;
- portfolio weight sums within numerical tolerance;
- a 6.26 percentage-point maximum allocation difference between balanced and
  valuation-heavy mixes;
- SQLite scenario creation and subsequent listing; and
- a stable `ZERO_AGENT_WEIGHT` error for an all-zero mix.

Automated browser screenshot QA was not completed because the available Windows
browser controller could not safely determine the current Chrome URL. Component
interaction tests, production rendering compilation, live frontend HTTP 200,
and the complete API data path were verified instead.

