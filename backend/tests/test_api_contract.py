from fastapi.testclient import TestClient
import pytest

from app.main import app


def test_health_and_assumptions_contract() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        response = client.get("/api/v1/portfolio/assumptions")
    assert response.status_code == 200
    body = response.json()
    assert set(body["assets"]) == {"us_equity", "us_treasury", "gold", "cash"}
    assert body["model_version"] == "tpa-v1"


def test_validation_uses_structured_error_envelope() -> None:
    with TestClient(app) as client:
        response = client.post("/api/v1/portfolio/optimize", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_presets_include_required_profiles() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/presets")
    assert response.status_code == 200
    assert set(response.json()) == {"balanced", "defensive", "value"}


def test_mock_analysis_contract_is_available_without_api_key() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/analysis/latest?mode=mock")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "mock"
    assert len(body["analyses"]) == 6
    assert all(set(item["scores"]) == {"us_equity", "us_treasury", "gold", "cash"} for item in body["analyses"])


def test_unconfigured_llm_uses_stable_error() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/analysis/latest?mode=llm")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODEL_NOT_CONFIGURED"


def test_fader_change_reaches_optimizer_through_http() -> None:
    common = {
        "analysis_run_id": "mock-2026-10-31-v1",
        "constraints": {
            "max_weights": {
                "us_equity": 0.65,
                "us_treasury": 0.70,
                "gold": 0.30,
                "cash": 0.40,
            },
            "min_cash": 0.03,
            "max_illiquid_weight": 0.85,
        },
    }
    with TestClient(app) as client:
        value = client.post(
            "/api/v1/portfolio/optimize",
            json={
                **common,
                "agent_weights": {"valuation": 100},
                "enabled_agents": ["valuation"],
                "risk_tolerance": "balanced",
            },
        )
        defensive = client.post(
            "/api/v1/portfolio/optimize",
            json={
                **common,
                "agent_weights": {"risk": 70, "liquidity": 30},
                "enabled_agents": ["risk", "liquidity"],
                "risk_tolerance": "conservative",
            },
        )
    assert value.status_code == defensive.status_code == 200
    value_weights = value.json()["portfolio_weights"]
    defensive_weights = defensive.json()["portfolio_weights"]
    assert max(abs(value_weights[key] - defensive_weights[key]) for key in value_weights) > 0.05
    assert sum(value_weights.values()) == pytest.approx(1.0, abs=2e-5)
    assert sum(defensive_weights.values()) == pytest.approx(1.0, abs=2e-5)


def test_zero_weights_stop_http_calculation() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/portfolio/optimize",
            json={
                "analysis_run_id": "mock-2026-10-31-v1",
                "agent_weights": {"macro": 0, "risk": 0},
                "enabled_agents": ["macro", "risk"],
                "risk_tolerance": "balanced",
                "constraints": {},
            },
        )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ZERO_AGENT_WEIGHT"

