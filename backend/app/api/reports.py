from datetime import UTC, datetime

from fastapi import APIRouter

from app.data.assumptions import ASSET_NAMES
from app.schemas.scenario import ReportRequest, ReportResponse


router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportResponse)
def create_report(request: ReportRequest) -> ReportResponse:
    result = request.result
    largest_asset = max(result.portfolio_weights, key=result.portfolio_weights.get)
    strongest_signal = max(result.mixed_scores, key=lambda key: abs(result.mixed_scores[key]))
    rationale = [
        (
            f"{ASSET_NAMES[asset_id]}은 조정 기대수익률 "
            f"{result.adjusted_expected_returns[asset_id]:.1%}를 바탕으로 {weight:.1%}를 배분합니다."
        )
        for asset_id, weight in result.portfolio_weights.items()
    ]
    return ReportResponse(
        title=f"AlphaMix 의사결정 보고서 — {request.scenario_name}",
        generated_at=datetime.now(UTC),
        executive_summary=(
            f"최적 포트폴리오는 {ASSET_NAMES[largest_asset]}에 가장 높은 비중을 배분하고 "
            f"{result.volatility:.1%} 변동성에서 {result.expected_return:.1%} 기대수익률을 목표로 합니다. "
            f"가장 강한 통합 신호는 {ASSET_NAMES[strongest_signal]} "
            f"({result.mixed_scores[strongest_signal]:+.2f})입니다."
        ),
        allocation_rationale=rationale,
        agent_evidence=request.agent_evidence,
        critic_warnings=request.critic_warnings,
        limitations=[
            "결과는 실시간 시장 데이터가 아닌 재현 가능한 샘플 가정을 사용합니다.",
            "기대수익률과 공분산은 추정치이며 실제 결과와 다를 수 있습니다.",
            "필수 위험 제약은 Agent 페이더 설정과 관계없이 계속 적용됩니다.",
        ],
    )

