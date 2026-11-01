from fastapi import APIRouter

from app.schemas.market import MarketSnapshot
from app.services.market_data import get_market_snapshot


router = APIRouter(prefix="/market", tags=["market"])


@router.get("/snapshot", response_model=MarketSnapshot)
async def market_snapshot() -> MarketSnapshot:
    return await get_market_snapshot()
