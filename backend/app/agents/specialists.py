"""Specialist agent facade shared by mock and LLM execution."""

from app.schemas.agent import AgentAnalysis
from app.schemas.common import AGENT_IDS

from .catalog import mock_analysis
from .llm_adapter import AnalysisAdapter, OpenAICompatibleAdapter

AGENT_NAMES = {
    "macro": "Macro Agent",
    "valuation": "Valuation Agent",
    "flow": "Flow Agent",
    "risk": "Risk Agent",
    "liquidity": "Liquidity Agent",
    "geopolitical": "Geopolitical Agent",
}


def analyze_specialist(agent_id: str, mode: str = "mock", adapter: AnalysisAdapter | None = None) -> AgentAnalysis:
    if agent_id not in AGENT_IDS:
        raise ValueError(f"Unsupported agent_id: {agent_id}")
    if mode == "mock":
        return mock_analysis(agent_id)
    if mode != "llm":
        raise ValueError("mode must be 'mock' or 'llm'")
    model = adapter or OpenAICompatibleAdapter()
    return model.analyze(agent_id, AGENT_NAMES[agent_id])

