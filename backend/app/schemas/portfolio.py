from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.common import AGENT_IDS, ASSET_IDS, AgentId, AssetId, StrictModel


RiskTolerance = Literal["conservative", "balanced", "growth"]


class PortfolioConstraints(StrictModel):
    max_weights: dict[AssetId, float] = {
        "us_equity": 0.65,
        "us_treasury": 0.70,
        "gold": 0.30,
        "cash": 0.40,
    }
    min_cash: float = Field(default=0.03, ge=0, le=1)
    max_illiquid_weight: float = Field(default=0.85, ge=0, le=1)
    max_volatility: float | None = Field(default=None, gt=0, le=1)

    @field_validator("max_weights")
    @classmethod
    def validate_caps(cls, caps: dict[AssetId, float]) -> dict[AssetId, float]:
        if not caps:
            raise ValueError("max_weights cannot be empty")
        if any(value < 0 or value > 1 for value in caps.values()):
            raise ValueError("asset caps must be between 0 and 1")
        return caps


class OptimizationRequest(StrictModel):
    analysis_run_id: str
    agent_weights: dict[AgentId, float]
    enabled_agents: list[AgentId]
    risk_tolerance: RiskTolerance = "balanced"
    constraints: PortfolioConstraints = PortfolioConstraints()

    @field_validator("agent_weights")
    @classmethod
    def validate_agent_weights(cls, weights: dict[AgentId, float]) -> dict[AgentId, float]:
        if any(weight < 0 or weight > 100 for weight in weights.values()):
            raise ValueError("fader weights must be between 0 and 100")
        return weights

    @model_validator(mode="after")
    def validate_agents(self) -> "OptimizationRequest":
        if len(self.enabled_agents) != len(set(self.enabled_agents)):
            raise ValueError("enabled_agents cannot contain duplicates")
        unknown_enabled = set(self.enabled_agents).difference(AGENT_IDS)
        if unknown_enabled:
            raise ValueError(f"unsupported agents: {sorted(unknown_enabled)}")
        return self


class OptimizationResponse(StrictModel):
    optimization_id: str
    analysis_run_id: str
    status: Literal["optimal", "optimal_inaccurate"]
    normalized_agent_weights: dict[AgentId, float]
    mixed_scores: dict[AssetId, float]
    base_expected_returns: dict[AssetId, float]
    adjusted_expected_returns: dict[AssetId, float]
    portfolio_weights: dict[AssetId, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    binding_constraints: list[str]
    warnings: list[str]
    model_version: str
    data_as_of: datetime


class PortfolioAssumptionsResponse(StrictModel):
    assets: dict[AssetId, str]
    base_expected_returns: dict[AssetId, float]
    volatility: dict[AssetId, float]
    covariance: list[list[float]]
    score_sensitivity: dict[AssetId, float]
    default_constraints: PortfolioConstraints
    model_version: str
    data_as_of: datetime

