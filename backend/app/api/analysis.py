from typing import Literal

from fastapi import APIRouter, Query

from app.agents import AgentOutputError, ModelNotConfiguredError, run_analysis
from app.exceptions import AlphaMixError
from app.schemas.agent import AnalysisRun


router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/latest", response_model=AnalysisRun)
def get_latest_analysis(
    mode: Literal["mock", "llm"] = Query(default="mock"),
) -> AnalysisRun:
    try:
        return run_analysis(mode=mode)
    except ModelNotConfiguredError as exc:
        raise AlphaMixError(
            "MODEL_NOT_CONFIGURED",
            "LLM mode requires provider URL, model name, and API key environment variables.",
            status_code=503,
            details={"fallback_mode": "mock"},
        ) from exc
    except AgentOutputError as exc:
        raise AlphaMixError(
            "INVALID_AGENT_OUTPUT",
            "An agent response did not satisfy the structured output contract.",
            status_code=502,
        ) from exc

