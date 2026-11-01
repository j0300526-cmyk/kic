from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from app.api import market, overview, portfolio, presets, reports, risk_events, scenarios
from app.config import get_settings
from app.db.repository import get_scenario_repository
from app.exceptions import AlphaMixError, alphamix_error_handler


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_scenario_repository().initialize()
    yield


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="멀티 Agent TPA 포트폴리오 의사결정 지원 API",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_exception_handler(AlphaMixError, alphamix_error_handler)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "요청이 API 계약과 일치하지 않습니다.",
                "details": {"errors": jsonable_encoder(exc.errors())},
            }
        },
    )


for api_router in (
    overview.router,
    market.router,
    portfolio.router,
    presets.router,
    scenarios.router,
    reports.router,
    risk_events.router,
):
    app.include_router(api_router, prefix="/api/v1")

# The agent workstream owns this router. Keeping it optional makes the quant
# package independently testable while still exposing it in the integrated app.
try:
    from app.api.analysis import router as analysis_router
except ImportError:
    analysis_router = None
if analysis_router is not None:
    app.include_router(analysis_router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "mock-ready"}

