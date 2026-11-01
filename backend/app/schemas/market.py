from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class MarketTickerItem(BaseModel):
    id: Literal["sp500", "us10y", "gold", "dxy"]
    symbol: str
    label: str
    value: float
    formatted_value: str
    change: float
    change_percent: float
    formatted_change: str
    direction: Literal["positive", "negative", "flat"]
    currency: str | None = None
    market_time: datetime
    source_url: HttpUrl | None = None


class MarketSnapshot(BaseModel):
    provider: Literal["yahoo_finance", "mock"]
    status: Literal["delayed", "stale", "fallback"]
    source_label: str
    source_url: HttpUrl | None = None
    as_of: datetime
    fetched_at: datetime
    cached: bool = False
    cache_ttl_seconds: int = Field(ge=0)
    items: list[MarketTickerItem]
    notice: str
