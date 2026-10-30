"""Specialist agent facade shared by mock and LLM execution."""

from app.schemas.agent import AgentAnalysis
from app.schemas.common import AGENT_IDS

from .catalog import mock_analysis
from .llm_adapter import AnalysisAdapter, OpenAICompatibleAdapter

AGENT_NAMES = {
    "macro": "거시경제 Agent",
    "valuation": "가치평가 Agent",
    "flow": "수급 Agent",
    "risk": "위험관리 Agent",
    "liquidity": "유동성 Agent",
    "geopolitical": "지정학 Agent",
}


def analyze_specialist(agent_id: str, mode: str = "mock", adapter: AnalysisAdapter | None = None) -> AgentAnalysis:
    if agent_id not in AGENT_IDS:
        raise ValueError(f"지원하지 않는 agent_id입니다: {agent_id}")
    if mode == "mock":
        return mock_analysis(agent_id)
    if mode != "llm":
        raise ValueError("mode는 'mock' 또는 'llm'이어야 합니다")
    model = adapter or OpenAICompatibleAdapter()
    return model.analyze(agent_id, AGENT_NAMES[agent_id])

