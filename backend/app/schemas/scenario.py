from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import AgentId, StrictModel
from app.schemas.portfolio import OptimizationRequest, OptimizationResponse


class ScenarioCreate(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    request: OptimizationRequest
    result: OptimizationResponse


class Scenario(ScenarioCreate):
    id: str
    created_at: datetime


class ScenarioSummary(StrictModel):
    id: str
    name: str
    created_at: datetime
    normalized_agent_weights: dict[AgentId, float]
    expected_return: float
    volatility: float


class ReportRequest(StrictModel):
    scenario_name: str = "현재 믹스"
    result: OptimizationResponse
    agent_evidence: list[dict[str, Any]] = []
    critic_warnings: list[str] = []


class ReportResponse(StrictModel):
    title: str
    generated_at: datetime
    executive_summary: str
    allocation_rationale: list[str]
    agent_evidence: list[dict[str, Any]]
    critic_warnings: list[str]
    limitations: list[str]

