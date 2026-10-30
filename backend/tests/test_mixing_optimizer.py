import pytest

from app.exceptions import AlphaMixError
from app.schemas.common import AGENT_IDS
from app.schemas.portfolio import OptimizationRequest, PortfolioConstraints
from app.services.mixing import normalize_agent_weights
from app.services.optimizer import optimize_portfolio


def make_request(**overrides) -> OptimizationRequest:
    data = {
        "analysis_run_id": "mock-2026-10-31-v1",
        "agent_weights": dict.fromkeys(AGENT_IDS, 20),
        "enabled_agents": list(AGENT_IDS),
        "risk_tolerance": "balanced",
        "constraints": PortfolioConstraints(),
    }
    data.update(overrides)
    return OptimizationRequest(**data)


def test_enabled_weights_normalize_and_disabled_weights_are_zero() -> None:
    normalized = normalize_agent_weights(
        {"macro": 25, "valuation": 75, "risk": 100},
        ["macro", "valuation"],
    )
    assert sum(normalized.values()) == pytest.approx(1.0)
    assert normalized["macro"] == pytest.approx(0.25)
    assert normalized["valuation"] == pytest.approx(0.75)
    assert normalized["risk"] == 0


def test_all_zero_enabled_weights_fail() -> None:
    with pytest.raises(AlphaMixError, match="positive weight") as exc_info:
        normalize_agent_weights(dict.fromkeys(AGENT_IDS, 0), list(AGENT_IDS))
    assert exc_info.value.code == "ZERO_AGENT_WEIGHT"


def test_fader_mix_changes_actual_optimized_portfolio(analysis_run) -> None:
    valuation = optimize_portfolio(
        make_request(
            agent_weights={"valuation": 100},
            enabled_agents=["valuation"],
        ),
        analysis_run,
    )
    defensive = optimize_portfolio(
        make_request(
            agent_weights={"risk": 70, "liquidity": 30},
            enabled_agents=["risk", "liquidity"],
            risk_tolerance="conservative",
        ),
        analysis_run,
    )

    assert valuation.adjusted_expected_returns != defensive.adjusted_expected_returns
    max_delta = max(
        abs(valuation.portfolio_weights[asset] - defensive.portfolio_weights[asset])
        for asset in valuation.portfolio_weights
    )
    assert max_delta > 0.05
    assert sum(valuation.portfolio_weights.values()) == pytest.approx(1.0, abs=2e-5)
    assert sum(defensive.portfolio_weights.values()) == pytest.approx(1.0, abs=2e-5)


def test_risk_agent_zero_does_not_remove_mandatory_constraints(analysis_run) -> None:
    constraints = PortfolioConstraints(
        max_weights={
            "us_equity": 0.35,
            "us_treasury": 0.70,
            "gold": 0.30,
            "cash": 0.40,
        },
        min_cash=0.10,
        max_illiquid_weight=0.50,
        max_volatility=0.09,
    )
    result = optimize_portfolio(
        make_request(
            agent_weights={"valuation": 100, "risk": 0},
            enabled_agents=["valuation", "risk"],
            constraints=constraints,
        ),
        analysis_run,
    )

    assert result.normalized_agent_weights["risk"] == 0
    assert result.portfolio_weights["us_equity"] <= 0.35 + 2e-5
    assert result.portfolio_weights["cash"] >= 0.10 - 2e-5
    assert result.volatility <= 0.09 + 2e-5
    assert any("mandatory" in warning.lower() for warning in result.warnings)


def test_infeasible_caps_return_stable_error(analysis_run) -> None:
    constraints = PortfolioConstraints(
        max_weights={
            "us_equity": 0.10,
            "us_treasury": 0.10,
            "gold": 0.10,
            "cash": 0.10,
        }
    )
    with pytest.raises(AlphaMixError) as exc_info:
        optimize_portfolio(make_request(constraints=constraints), analysis_run)
    assert exc_info.value.code == "OPTIMIZATION_INFEASIBLE"

