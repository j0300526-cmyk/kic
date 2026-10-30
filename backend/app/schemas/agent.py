from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.common import ASSET_IDS, AgentId, AssetId, SourceReference, StrictModel


class AgentAnalysis(StrictModel):
    agent_id: AgentId
    agent_name: str
    mode: Literal["mock", "llm"]
    assets: list[AssetId]
    scores: dict[AssetId, float]
    sources: list[SourceReference]
    rationale: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    uncertainties: list[str] = Field(min_length=1)
    as_of: datetime

    @field_validator("scores")
    @classmethod
    def validate_scores(cls, scores: dict[AssetId, float]) -> dict[AssetId, float]:
        if set(scores) != set(ASSET_IDS):
            raise ValueError("scores에는 지원하는 네 자산이 정확히 포함되어야 합니다")
        if any(score < -1 or score > 1 for score in scores.values()):
            raise ValueError("Agent 점수는 -1에서 1 사이여야 합니다")
        return scores

    @field_validator("assets")
    @classmethod
    def validate_assets(cls, assets: list[AssetId]) -> list[AssetId]:
        if set(assets) != set(ASSET_IDS) or len(assets) != len(ASSET_IDS):
            raise ValueError("assets에는 지원하는 네 자산이 정확히 포함되어야 합니다")
        return assets


class CriticResult(StrictModel):
    approved: bool
    warnings: list[str]
    revision_requests: list[str]
    checked_agent_ids: list[AgentId]


class AnalysisRun(StrictModel):
    analysis_run_id: str
    mode: Literal["mock", "llm"]
    data_as_of: datetime
    analyses: list[AgentAnalysis]
    critic: CriticResult
    warnings: list[str]

    @model_validator(mode="after")
    def validate_unique_agents(self) -> "AnalysisRun":
        agent_ids = [analysis.agent_id for analysis in self.analyses]
        if len(agent_ids) != len(set(agent_ids)):
            raise ValueError("분석 실행 결과에 중복 Agent가 포함되어 있습니다")
        return self

