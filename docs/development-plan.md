# AlphaMix Development Plan

## Delivery principle

The first vertical slice must prove that changing the six agent faders changes
the normalized opinions, adjusted expected returns, and optimized portfolio
while all mandatory portfolio constraints remain enforced.

## Workstreams

| Workstream | Scope |
| --- | --- |
| frontend-1 | Application shell, navigation, overview, analysis, report |
| frontend-2 | Mixing faders, charts, presets, before/after comparison |
| backend-1 | Agent schema, deterministic mock agents, LangGraph, critic |
| backend-2 | Market assumptions, mixing, CVXPY optimization, API, SQLite |
| business | Scenarios, financial assumptions, acceptance evidence |

## Phases

### Phase 1 — contracts and structure

- [x] Inspect and preserve the existing repository.
- [x] Define architecture, API contract, and development plan.
- [x] Scaffold backend and frontend packages.
- Exit: contracts cover zero weights, source warnings, mandatory risk limits,
  mock provenance, and reproducibility identifiers.

### Phase 2 — backend vertical slice

- Implement deterministic analyses for all six agents.
- Run the critic and expose analysis results.
- Normalize enabled weights and mix per-asset scores.
- Adjust sample expected returns and solve with CVXPY.
- Validate weight sum, caps, liquidity, and risk budget.
- Exit: two materially different presets produce different feasible portfolios.

### Phase 3 — frontend vertical slice

- Build the institutional dashboard shell and all six routes/views.
- Implement six vertical faders, enable controls, normalization, and presets.
- Debounce optimization calls and render loading/error/empty states.
- Render current versus baseline allocations and risk/return metrics.
- Exit: a fader change visibly updates the allocation through the real API.

### Phase 4 — integration and persistence

- Save and reload scenarios in SQLite.
- Compare multiple scenario snapshots.
- Generate a structured on-screen report.
- Add mock/LLM badges and evidence warnings.
- Exit: saved scenarios survive an API restart.

### Phase 5 — LangGraph and model adapter

- Wire specialist nodes and critic/revision routing with one retry maximum.
- Provide an environment-driven LLM adapter without changing response schemas.
- Preserve deterministic mock mode as the default.
- Exit: mock tests need no credentials; missing LLM configuration is explicit.

### Phase 6 — verification and handoff

- Backend unit and API tests with pytest.
- Frontend normalization and interaction tests with Vitest.
- Production builds and an end-to-end smoke test.
- Document local startup, limitations, and sample workflows.

## Acceptance checks

1. Enabled agent weights normalize to 100% within tolerance.
2. All-zero enabled weights stop calculation with a clear error.
3. Balanced, defensive, and value mixes produce distinct adjusted returns and
   at least two distinct portfolio allocations.
4. Setting Risk Agent influence to zero does not remove mandatory asset caps,
   minimum cash, liquidity, or risk constraints.
5. Every agent output passes the Pydantic schema.
6. The critic flags missing sources and inconsistent evidence.
7. Optimizer infeasibility uses a stable structured error.
8. Every successful portfolio sums to 100% and passes all constraints.
9. Mock runs are deterministic and record model/data versions.
10. Frontend clearly labels mock data.

## Change and test log

Implementation updates append to this table rather than rewriting history.

| Date | Phase | Change | Verification |
| --- | --- | --- | --- |
| 2026-10-31 | 1 | Initial architecture, API contract, and plan | Repository inspected; documentation review pending implementation |
| 2026-10-31 | 2 | Added deterministic agents, Critic, mixing, CVXPY optimizer, mandatory constraints, and FastAPI endpoints | Backend suite: 18 passed; compileall succeeded |
| 2026-10-31 | 3 | Added six-view React dashboard and vertical Mixing Console with presets, activation, normalization, and comparisons | Frontend suite: 6 passed; Vite production build succeeded |
| 2026-10-31 | 4 | Connected frontend optimization and scenario payloads to the API and SQLite repository | HTTP analysis, optimization, save, and list flow succeeded |
| 2026-10-31 | 5 | Added LangGraph fan-out, Critic revision loop, mock fallback, and environment-driven LLM adapter | Agent tests included in backend suite; missing LLM configuration is explicit |
| 2026-10-31 | 6 | Ran full integration smoke checks and documented operation | Mix allocation delta 6.26%p; zero mix returned `ZERO_AGENT_WEIGHT`; browser automation unavailable |

