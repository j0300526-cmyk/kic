import pytest

from app.agents import ModelNotConfiguredError, run_analysis
from app.agents.catalog import mock_analysis
from app.agents.critic import repair_flagged_analyses, review_analyses
from app.agents.specialists import analyze_specialist
from app.schemas.common import AGENT_IDS, ASSET_IDS


def test_mock_workflow_is_complete_valid_and_reproducible() -> None:
    first = run_analysis()
    second = run_analysis()
    assert first == second
    assert first.analysis_run_id == "mock-2026-10-31-v1"
    assert first.critic.approved is True
    assert first.critic.checked_agent_ids == list(AGENT_IDS)
    assert [item.agent_id for item in first.analyses] == list(AGENT_IDS)
    for item in first.analyses:
        assert item.mode == "mock"
        assert set(item.assets) == set(ASSET_IDS)
        assert set(item.scores) == set(ASSET_IDS)
        assert all(-1 <= score <= 1 for score in item.scores.values())
        assert item.sources and item.rationale and item.uncertainties


def test_critic_flags_and_repairs_unsourced_claim() -> None:
    analyses = {agent_id: mock_analysis(agent_id) for agent_id in AGENT_IDS}
    analyses["macro"] = analyses["macro"].model_copy(update={"sources": []})
    review = review_analyses(analyses.values())
    assert review.approved is False
    assert any("출처 없는 AI 주장" in warning for warning in review.warnings)
    repaired = repair_flagged_analyses(analyses, review.revision_requests)
    assert review_analyses(repaired.values()).approved is True
    assert repaired["macro"].sources


def test_critic_detects_missing_agent() -> None:
    analyses = [mock_analysis(agent_id) for agent_id in AGENT_IDS[:-1]]
    result = review_analyses(analyses)
    assert result.approved is False
    assert result.revision_requests == [
        "geopolitical: 분석 결과가 누락되었습니다."
    ]


def test_llm_mode_requires_explicit_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for variable in (
        "ALPHAMIX_LLM_API_URL",
        "ALPHAMIX_LLM_API_KEY",
        "ALPHAMIX_LLM_MODEL",
    ):
        monkeypatch.delenv(variable, raising=False)
    with pytest.raises(ModelNotConfiguredError):
        analyze_specialist("macro", mode="llm")


def test_fake_llm_adapter_uses_same_schema() -> None:
    class FakeAdapter:
        def analyze(self, agent_id: str, agent_name: str):
            return mock_analysis(agent_id).model_copy(
                update={"mode": "llm", "agent_name": agent_name}
            )

    result = run_analysis(mode="llm", adapter=FakeAdapter())
    assert result.mode == "llm"
    assert result.critic.approved is True
    assert {item.mode for item in result.analyses} == {"llm"}

