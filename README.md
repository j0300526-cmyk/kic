# AlphaMix

**Multi-Agent TPA Portfolio Decision Platform** for the KIC AI Agent
competition.

AlphaMix combines six specialist market views through an audio-console-style
mixing interface and feeds the normalized signal into a constrained Total
Portfolio Approach optimizer. The first MVP supports US equities, US
Treasuries, gold, and cash. It runs deterministically with mock data and no API
key.

## Quick start

The default configuration uses deterministic mock agents and does not require
an API key.

### Backend

```powershell
cd backend
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

FastAPI documentation is available at `http://localhost:8000/docs`.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend connects to
`http://localhost:8000/api/v1` by default. Override it with
`VITE_API_BASE_URL` when needed.

## Verification

```powershell
cd backend
python -m pytest

cd ../frontend
npm test
npm run build
```

The integrated MVP has 18 passing backend tests and 6 passing frontend tests.
The HTTP smoke test verifies that different Agent mixes produce materially
different feasible allocations, zero total influence is rejected, and scenario
snapshots persist in SQLite.

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Development plan and test log](docs/development-plan.md)
- [Business scenarios](docs/business-scenarios.md)
- [Validation report](docs/validation-report.md)

## Optional LLM mode

Copy `.env.example` to `backend/.env`, select `mode=llm` on the analysis API,
and configure `ALPHAMIX_LLM_API_URL`, `ALPHAMIX_LLM_MODEL`, and
`ALPHAMIX_LLM_API_KEY`. Mock and LLM analyses use the same validated schema.

> AlphaMix is a decision-support competition prototype. Its sample assumptions
> are illustrative and must not be interpreted as investment advice.
