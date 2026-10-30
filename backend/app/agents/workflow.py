"""LangGraph fan-out workflow with a deterministic minimal fallback."""

from __future__ import annotations

from typing import Annotated, Any, Callable, TypedDict

from app.schemas.agent import AgentAnalysis, AnalysisRun, CriticResult
from app.schemas.common import AGENT_IDS

from .catalog import MOCK_AS_OF
from .critic import repair_flagged_analyses, review_analyses
from .llm_adapter import AnalysisAdapter, OpenAICompatibleAdapter
from .specialists import analyze_specialist

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:  # pragma: no cover - only for intentionally minimal installs
    END = START = StateGraph = None  # type: ignore[assignment,misc]


def _merge_analyses(
    left: dict[str, AgentAnalysis], right: dict[str, AgentAnalysis]
) -> dict[str, AgentAnalysis]:
    return {**(left or {}), **(right or {})}


class AnalysisState(TypedDict, total=False):
    mode: str
    analyses: Annotated[dict[str, AgentAnalysis], _merge_analyses]
    critic: CriticResult
    revision_count: int


class _FallbackGraph:
    def __init__(self, adapter: AnalysisAdapter | None = None) -> None:
        self.adapter = adapter

    def invoke(self, state: dict[str, Any]) -> dict[str, Any]:
        mode = state.get("mode", "mock")
        analyses = {
            agent_id: analyze_specialist(agent_id, mode, self.adapter)
            for agent_id in AGENT_IDS
        }
        critic = review_analyses(analyses.values())
        revision_count = 0
        if critic.revision_requests:
            analyses = repair_flagged_analyses(analyses, critic.revision_requests)
            revision_count = 1
            critic = review_analyses(analyses.values())
        return {
            **state,
            "analyses": analyses,
            "critic": critic,
            "revision_count": revision_count,
        }


def build_analysis_graph(adapter: AnalysisAdapter | None = None) -> Any:
    """Compile six parallel specialists, a critic, and one revision pass."""

    if StateGraph is None:
        return _FallbackGraph(adapter)
    graph = StateGraph(AnalysisState)
    for agent_id in AGENT_IDS:
        graph.add_node(agent_id, _specialist_node(agent_id, adapter))
        graph.add_edge(START, agent_id)
    graph.add_node("critic", _critic_node)
    graph.add_node("revise", _revise_node)
    graph.add_edge(list(AGENT_IDS), "critic")
    graph.add_conditional_edges(
        "critic", _route_after_critic, {"revise": "revise", "done": END}
    )
    graph.add_edge("revise", "critic")
    return graph.compile()


def run_analysis(
    mode: str = "mock", adapter: AnalysisAdapter | None = None
) -> AnalysisRun:
    """Run all specialists and return the shared API response model."""

    if mode not in {"mock", "llm"}:
        raise ValueError("mode must be 'mock' or 'llm'")
    if mode == "llm" and adapter is None:
        adapter = OpenAICompatibleAdapter()  # fail before fan-out if not configured
    state = build_analysis_graph(adapter).invoke(
        {"mode": mode, "analyses": {}, "revision_count": 0}
    )
    analyses = [state["analyses"][agent_id] for agent_id in AGENT_IDS]
    critic = state["critic"]
    data_as_of = max(
        (analysis.as_of for analysis in analyses), default=MOCK_AS_OF
    )
    return AnalysisRun(
        analysis_run_id=f"{mode}-{data_as_of.date().isoformat()}-v1",
        mode=mode,
        data_as_of=data_as_of,
        analyses=analyses,
        critic=critic,
        warnings=critic.warnings,
    )


def _specialist_node(
    agent_id: str, adapter: AnalysisAdapter | None
) -> Callable[[AnalysisState], dict[str, Any]]:
    def node(state: AnalysisState) -> dict[str, Any]:
        result = analyze_specialist(
            agent_id, state.get("mode", "mock"), adapter
        )
        return {"analyses": {agent_id: result}}

    return node


def _critic_node(state: AnalysisState) -> dict[str, Any]:
    return {"critic": review_analyses(state.get("analyses", {}).values())}


def _revise_node(state: AnalysisState) -> dict[str, Any]:
    critic = state["critic"]
    return {
        "analyses": repair_flagged_analyses(
            state.get("analyses", {}), critic.revision_requests
        ),
        "revision_count": state.get("revision_count", 0) + 1,
    }


def _route_after_critic(state: AnalysisState) -> str:
    if state["critic"].revision_requests and state.get("revision_count", 0) < 1:
        return "revise"
    return "done"

