from typing import Literal

from fastapi import APIRouter, Query

from app.schemas.risk_events import RiskEventFeed
from app.services.risk_events import get_risk_event_feed


router = APIRouter(prefix="/risk", tags=["risk-events"])


@router.get("/events", response_model=RiskEventFeed)
async def risk_events(
    window: Literal["24h", "7d"] = Query(default="24h"),
) -> RiskEventFeed:
    return await get_risk_event_feed(window)
