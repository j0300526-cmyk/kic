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
            "LLM 모드에는 제공자 URL, 모델명, API 키 환경변수가 필요합니다.",
            status_code=503,
            details={"fallback_mode": "mock"},
        ) from exc
    except AgentOutputError as exc:
        raise AlphaMixError(
            "INVALID_AGENT_OUTPUT",
            "Agent 응답이 구조화된 출력 계약을 충족하지 못했습니다.",
            status_code=502,
        ) from exc

