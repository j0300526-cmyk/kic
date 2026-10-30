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
            f"{ASSET_NAMES[asset_id]} receives {weight:.1%} based on adjusted expected "
            f"return {result.adjusted_expected_returns[asset_id]:.1%}."
        )
        for asset_id, weight in result.portfolio_weights.items()
    ]
    return ReportResponse(
        title=f"AlphaMix Decision Report — {request.scenario_name}",
        generated_at=datetime.now(UTC),
        executive_summary=(
            f"The optimized portfolio allocates most to {ASSET_NAMES[largest_asset]} and "
            f"targets {result.expected_return:.1%} expected return at {result.volatility:.1%} "
            f"volatility. The strongest blended signal is {ASSET_NAMES[strongest_signal]} "
            f"({result.mixed_scores[strongest_signal]:+.2f})."
        ),
        allocation_rationale=rationale,
        agent_evidence=request.agent_evidence,
        critic_warnings=request.critic_warnings,
        limitations=[
            "Results use deterministic sample assumptions rather than live market data.",
            "Expected returns and covariances are estimates and can differ from realized outcomes.",
            "Mandatory risk constraints remain active regardless of Agent fader settings.",
        ],
    )

