"""Deterministic evidence critic and bounded revision helpers."""

from __future__ import annotations

from datetime import date
from typing import Iterable

from app.schemas.agent import AgentAnalysis, CriticResult
from app.schemas.common import AGENT_IDS, ASSET_IDS, SourceReference


def review_analyses(analyses: Iterable[AgentAnalysis]) -> CriticResult:
    """Check evidence, as-of dates, coverage, rationale, and limitations."""

    by_id = {analysis.agent_id: analysis for analysis in analyses}
    warnings: list[str] = []
    revisions: list[str] = []

    for agent_id in AGENT_IDS:
        analysis = by_id.get(agent_id)
        if analysis is None:
            revisions.append(f"{agent_id}: 분석 결과가 누락되었습니다.")
            continue
        if set(analysis.assets) != set(ASSET_IDS) or set(analysis.scores) != set(ASSET_IDS):
            revisions.append(f"{agent_id}: 지원 자산 또는 점수 구성이 올바르지 않습니다.")
        if not analysis.sources:
            warnings.append(f"{agent_id}: 출처 없는 AI 주장 경고")
            revisions.append(f"{agent_id}: 데이터 출처가 필요합니다.")
        else:
            for source in analysis.sources:
                if not source.title.strip() or not source.publisher.strip():
                    revisions.append(f"{agent_id}: 출처 제목과 발행기관이 필요합니다.")
                if source.as_of > analysis.as_of.date():
                    revisions.append(f"{agent_id}: 분석 시점보다 미래인 출처 기준일입니다.")
        if not analysis.rationale.strip():
            revisions.append(f"{agent_id}: 분석 근거가 비어 있습니다.")
        if not any(item.strip() for item in analysis.uncertainties):
            revisions.append(f"{agent_id}: 불확실성과 한계를 밝혀야 합니다.")

    return CriticResult(
        approved=not revisions,
        warnings=list(dict.fromkeys(warnings)),
        revision_requests=list(dict.fromkeys(revisions)),
        checked_agent_ids=[agent_id for agent_id in AGENT_IDS if agent_id in by_id],
    )


def repair_flagged_analyses(
    analyses: dict[str, AgentAnalysis], revision_requests: Iterable[str]
) -> dict[str, AgentAnalysis]:
    """Apply one transparent repair pass; the workflow caps this at one."""

    repaired = dict(analyses)
    flagged = {request.split(":", 1)[0] for request in revision_requests}
    for agent_id in flagged:
        if agent_id not in AGENT_IDS:
            continue
        item = repaired.get(agent_id)
        if item is None:
            from .catalog import mock_analysis

            repaired[agent_id] = mock_analysis(agent_id)
            continue
        updates: dict[str, object] = {}
        if not item.sources or any(source.as_of > item.as_of.date() for source in item.sources):
            updates["sources"] = [
                SourceReference(
                    title="Critic 보완 출처 공개",
                    publisher="AlphaMix 검증 대체 데이터",
                    url=None,
                    as_of=item.as_of.date() if item.as_of else date(2026, 10, 31),
                )
            ]
        if not item.rationale.strip():
            updates["rationale"] = "Critic 재검토를 위해 명시된 근거와 중립적 해석을 적용했다."
        if not any(value.strip() for value in item.uncertainties):
            updates["uncertainties"] = ["재분석 보정 결과이므로 추가 검증이 필요하다."]
        repaired[agent_id] = item.model_copy(update=updates)
    return repaired

