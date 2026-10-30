from fastapi import APIRouter

from app.data.assumptions import (
    ASSET_NAMES,
    BASE_EXPECTED_RETURNS,
    COVARIANCE,
    DATA_AS_OF,
    DEFAULT_MAX_WEIGHTS,
    MODEL_VERSION,
    SCORE_SENSITIVITY,
    VOLATILITY,
)
from app.schemas.portfolio import (
    OptimizationRequest,
    OptimizationResponse,
    PortfolioAssumptionsResponse,
    PortfolioConstraints,
)
from app.services.optimizer import optimize_portfolio


router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/assumptions", response_model=PortfolioAssumptionsResponse)
def get_assumptions() -> PortfolioAssumptionsResponse:
    return PortfolioAssumptionsResponse(
        assets=ASSET_NAMES,
        base_expected_returns=BASE_EXPECTED_RETURNS,
        volatility=VOLATILITY,
        covariance=COVARIANCE.tolist(),
        score_sensitivity=SCORE_SENSITIVITY,
        default_constraints=PortfolioConstraints(max_weights=DEFAULT_MAX_WEIGHTS),
        model_version=MODEL_VERSION,
        data_as_of=DATA_AS_OF,
    )


@router.post("/optimize", response_model=OptimizationResponse)
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    # Import lazily so the deterministic API and the LangGraph implementation
    # remain separate modules with a small integration boundary.
    from app.agents import run_analysis

    mode = "llm" if request.analysis_run_id.startswith("llm-") else "mock"
    analysis_run = run_analysis(mode=mode)
    return optimize_portfolio(request, analysis_run)

