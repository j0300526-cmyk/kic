from datetime import UTC, datetime

import pytest

from app.schemas.agent import AgentAnalysis, AnalysisRun, CriticResult
from app.schemas.common import AGENT_IDS, ASSET_IDS, SourceReference


SCORES = {
    "macro": {"us_equity": 0.8, "us_treasury": -0.2, "gold": 0.3, "cash": -0.3},
    "valuation": {"us_equity": 0.7, "us_treasury": 0.1, "gold": -0.4, "cash": -0.2},
    "flow": {"us_equity": 0.5, "us_treasury": -0.3, "gold": 0.0, "cash": -0.1},
    "risk": {"us_equity": -0.8, "us_treasury": 0.7, "gold": 0.4, "cash": 0.5},
    "liquidity": {"us_equity": -0.3, "us_treasury": 0.4, "gold": -0.5, "cash": 0.9},
    "geopolitical": {"us_equity": -0.6, "us_treasury": 0.3, "gold": 0.9, "cash": 0.2},
}


@pytest.fixture
def analysis_run() -> AnalysisRun:
    as_of = datetime(2026, 10, 31, tzinfo=UTC)
    source = SourceReference(
        title="Deterministic fixture",
        publisher="AlphaMix tests",
        as_of=as_of.date(),
    )
    analyses = [
        AgentAnalysis(
            agent_id=agent_id,
            agent_name=f"{agent_id.title()} Agent",
            mode="mock",
            assets=list(ASSET_IDS),
            scores=SCORES[agent_id],
            sources=[source],
            rationale=f"Deterministic {agent_id} fixture.",
            confidence=0.8,
            uncertainties=["Fixture only."],
            as_of=as_of,
        )
        for agent_id in AGENT_IDS
    ]
    return AnalysisRun(
        analysis_run_id="mock-2026-10-31-v1",
        mode="mock",
        data_as_of=as_of,
        analyses=analyses,
        critic=CriticResult(
            approved=True,
            warnings=[],
            revision_requests=[],
            checked_agent_ids=list(AGENT_IDS),
        ),
        warnings=[],
    )

