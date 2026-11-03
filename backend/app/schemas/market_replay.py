from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


ReplayRange = Literal["6mo", "1y", "3y"]


class ReplayAssetValues(BaseModel):
    us_equity: float = Field(gt=0)
    us_treasury: float = Field(gt=0)
    gold: float = Field(gt=0)
    cash: float = Field(gt=0)


class MarketReplayPoint(BaseModel):
    date: date
    prices: ReplayAssetValues
    normalized: ReplayAssetValues


class MarketReplay(BaseModel):
    provider: Literal["yahoo_finance", "mock"]
    status: Literal["historical", "stale", "fallback"]
    source_label: str
    source_url: HttpUrl | None = None
    as_of: date
    fetched_at: datetime
    cached: bool = False
    cache_ttl_seconds: int = Field(ge=0)
    range: ReplayRange
    interval: Literal["1d"] = "1d"
    proxy_symbols: dict[str, str]
    points: list[MarketReplayPoint] = Field(min_length=2)
    notice: str
    warnings: list[str] = Field(default_factory=list)
