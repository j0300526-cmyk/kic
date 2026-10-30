# AlphaMix Architecture

## 1. Product boundary

AlphaMix is an institutional portfolio decision-support MVP. Six specialist
agents produce asset-level opinions, a critic validates those opinions, and a
Total Portfolio Approach (TPA) optimizer converts the user-controlled mix into
an investable allocation.

The MVP is decision support, not an order-management or autonomous trading
system. It runs without an API key by using deterministic mock analyses and
sample market data.

## 2. System view

```text
React / TypeScript / Vite
  Overview | Agent Analysis | Mixing Console | Optimization | Scenarios | Report
                    |
                    | JSON over /api/v1
                    v
FastAPI / Pydantic
  Analysis service ---- LangGraph workflow ---- 6 analysts + Critic
  Mixing service  ----- score aggregation
  Portfolio service --- CVXPY TPA optimizer
  Scenario service ---- SQLite repositories
                    |
             deterministic sample data
```

## 3. Main components

### Frontend

- `frontend/src`: single-page React application.
- One central application store owns the selected preset, enabled state,
  raw fader values, normalized weights, baseline result, and current result.
- Recharts renders allocation, risk/return, and before/after comparisons.
- The UI labels every analysis with `mock` or `llm` data provenance.
- A zero active-weight state is rejected before an optimization request and is
  also rejected by the API.

### Backend

- `backend/app/api`: versioned FastAPI routers.
- `backend/app/schemas`: shared Pydantic request and response contracts.
- `backend/app/agents`: specialist agent implementations, a critic, and the
  LangGraph orchestration graph.
- `backend/app/services`: score mixing, optimization, scenarios, and reports.
- `backend/app/data`: versioned sample assumptions used for reproducible runs.
- `backend/app/db`: SQLite models and repositories.

### Agent workflow

```text
START -> six specialist analyses (fan-out) -> Critic
      -> [approved] aggregate
      -> [revision requested] revise flagged agents -> Critic -> aggregate
```

The mock path and LLM path return the same `AgentAnalysis` schema. The model
adapter is selected with environment variables. Missing model configuration
always falls back to mock mode; secrets are never committed.

The critic is not a mixable opinion. It verifies source presence, as-of dates,
score ranges, internal consistency, and confidence/limitation disclosure. A
single bounded revision pass prevents loops.

## 4. Financial model

Initial assets:

| ID | Display name | Role |
| --- | --- | --- |
| `us_equity` | US Equity | Growth / risk asset |
| `us_treasury` | US Treasury | Duration / defensive asset |
| `gold` | Gold | Inflation and geopolitical hedge |
| `cash` | Cash | Liquidity reserve |

Each enabled agent contributes a standardized score in `[-1, 1]`. Raw fader
values are normalized across enabled agents:

```text
normalized_weight_i = raw_weight_i / sum(enabled raw weights)
mixed_score_asset = sum(normalized_weight_i * agent_score_i, i)
adjusted_return_asset = base_return_asset + score_scale_asset * mixed_score_asset
```

The convex optimizer maximizes risk-adjusted expected return:

```text
maximize adjusted_return @ w - risk_aversion * quad_form(w, covariance)
```

Subject to full investment, long-only weights, asset caps, a minimum cash
allocation, a liquidity budget, and a maximum volatility/risk budget. Mandatory
risk limits are request constraints applied after score mixing. They do not
depend on the Risk Agent fader and therefore remain active at a 0% Risk Agent
weight.

If the solver cannot satisfy the constraints, the API returns a structured
`OPTIMIZATION_INFEASIBLE` error rather than silently relaxing them.

## 5. Persistence and reproducibility

- SQLite stores named mix scenarios and their optimization snapshots.
- A request records `analysis_run_id`, `model_version`, `data_as_of`, normalized
  weights, constraints, and deterministic input assumptions.
- Mock outputs use fixed inputs rather than random numbers.
- Monetary execution and personal data are out of scope for the MVP.

## 6. Security and reliability

- Pydantic validates finite ranges and all cross-field constraints.
- CORS is restricted through configuration.
- API errors contain a stable code, a human-readable message, and optional
  field details.
- Agent claims without at least one source are flagged by the critic and shown
  as warnings.
- The optimizer verifies the returned weight sum and every constraint within a
  numerical tolerance before responding.

