from typing import Literal

from fastapi import APIRouter, Query

from app.schemas.market import MarketSnapshot
from app.schemas.market_replay import MarketReplay
from app.services.market_data import get_market_snapshot
from app.services.market_replay import get_market_replay


router = APIRouter(prefix="/market", tags=["market"])


@router.get("/snapshot", response_model=MarketSnapshot)
async def market_snapshot() -> MarketSnapshot:
    return await get_market_snapshot()


@router.get("/replay", response_model=MarketReplay)
async def market_replay(
    replay_range: Literal["6mo", "1y", "3y"] = Query("1y", alias="range"),
) -> MarketReplay:
    return await get_market_replay(replay_range)
