# AlphaMix API Contract

Base path: `/api/v1`

All timestamps are ISO 8601 UTC. All portfolio and agent weights are decimal
fractions in API responses; fader inputs are integers or floats from 0 to 100.

## 1. Shared types

### Asset

```json
{
  "id": "us_equity",
  "name": "US Equity"
}
```

### SourceReference

```json
{
  "title": "Mock US macro dataset",
  "publisher": "AlphaMix sample data",
  "url": null,
  "as_of": "2026-10-31"
}
```

### AgentAnalysis

```json
{
  "agent_id": "macro",
  "agent_name": "Macro Agent",
  "mode": "mock",
  "assets": ["us_equity", "us_treasury", "gold", "cash"],
  "scores": {
    "us_equity": 0.3,
    "us_treasury": 0.1,
    "gold": 0.2,
    "cash": -0.1
  },
  "sources": [],
  "rationale": "...",
  "confidence": 0.78,
  "uncertainties": ["Mock data is not live market data."],
  "as_of": "2026-10-31T00:00:00Z"
}
```

Rules: score `[-1, 1]`, confidence `[0, 1]`, non-empty rationale, at least one
uncertainty, and all four assets present.

### CriticResult

```json
{
  "approved": true,
  "warnings": [],
  "revision_requests": [],
  "checked_agent_ids": ["macro", "valuation", "flow", "risk", "liquidity", "geopolitical"]
}
```

## 2. Analysis

### `GET /analysis/latest?mode=mock`

Returns a reproducible analysis run:

```json
{
  "analysis_run_id": "mock-2026-10-31-v1",
  "mode": "mock",
  "data_as_of": "2026-10-31T00:00:00Z",
  "analyses": [],
  "critic": {},
  "warnings": []
}
```

`mode=llm` uses the configured model adapter. If it is not configured, the API
returns `MODEL_NOT_CONFIGURED`; the frontend may explicitly retry in mock mode.

## 3. Optimization

### `POST /portfolio/optimize`

Request:

```json
{
  "analysis_run_id": "mock-2026-10-31-v1",
  "agent_weights": {
    "macro": 20,
    "valuation": 20,
    "flow": 15,
    "risk": 20,
    "liquidity": 15,
    "geopolitical": 10
  },
  "enabled_agents": ["macro", "valuation", "flow", "risk", "liquidity", "geopolitical"],
  "risk_tolerance": "balanced",
  "constraints": {
    "max_weights": {
      "us_equity": 0.65,
      "us_treasury": 0.70,
      "gold": 0.30,
      "cash": 0.40
    },
    "min_cash": 0.03,
    "max_illiquid_weight": 0.85
  }
}
```

The server ignores disabled-agent raw values, validates that the enabled sum is
positive, and normalizes it to 1.0.

Response:

```json
{
  "optimization_id": "...",
  "analysis_run_id": "mock-2026-10-31-v1",
  "status": "optimal",
  "normalized_agent_weights": {"macro": 0.2},
  "mixed_scores": {"us_equity": 0.12},
  "base_expected_returns": {"us_equity": 0.075},
  "adjusted_expected_returns": {"us_equity": 0.084},
  "portfolio_weights": {
    "us_equity": 0.45,
    "us_treasury": 0.30,
    "gold": 0.15,
    "cash": 0.10
  },
  "expected_return": 0.061,
  "volatility": 0.098,
  "sharpe_ratio": 0.42,
  "binding_constraints": [],
  "warnings": [],
  "model_version": "tpa-v1",
  "data_as_of": "2026-10-31T00:00:00Z"
}
```

### `GET /portfolio/assumptions`

Returns asset labels, base returns, volatility, covariance, score sensitivities,
and default mandatory constraints used by the sample model.

## 4. Presets and scenarios

### `GET /presets`

Returns `balanced`, `defensive`, and `value` preset definitions.

### `GET /scenarios`

Lists saved scenario summaries.

### `POST /scenarios`

Persists a name, raw faders, enabled agents, normalized weights, request
constraints, and the current optimization snapshot.

### `GET /scenarios/{scenario_id}`

Returns one saved scenario.

### `DELETE /scenarios/{scenario_id}`

Deletes one scenario and returns HTTP 204.

## 5. Overview and reports

### `GET /overview`

Returns a compact mock market snapshot and the latest baseline allocation.

### `POST /reports`

Accepts a scenario/optimization snapshot and returns a structured report with
executive summary, agent evidence, critic warnings, portfolio rationale, and
limitations. The MVP renders this report in the web UI.

## 6. Error envelope

```json
{
  "error": {
    "code": "ZERO_AGENT_WEIGHT",
    "message": "At least one enabled agent must have a positive weight.",
    "details": {"agent_weights": "sum must be greater than zero"}
  }
}
```

Important codes: `VALIDATION_ERROR`, `ZERO_AGENT_WEIGHT`,
`ANALYSIS_NOT_FOUND`, `MODEL_NOT_CONFIGURED`, `OPTIMIZATION_INFEASIBLE`, and
`SCENARIO_NOT_FOUND`.

