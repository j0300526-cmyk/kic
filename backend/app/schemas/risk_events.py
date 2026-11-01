from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.common import AgentId, AssetId


class RiskEvent(BaseModel):
    id: str
    event_type: Literal["conflict", "policy", "trade", "macro"]
    severity: int = Field(ge=1, le=5)
    title: str
    summary: str
    url: HttpUrl | None = None
    publisher: str
    published_at: datetime
    source_country: str | None = None
    location_name: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_confidence: float = Field(ge=0, le=1)
    keywords: list[str]
    agent_impacts: dict[AgentId, float]
    asset_impacts: dict[AssetId, float]
    rationale: str
    data_mode: Literal["live", "mock"]


class RiskEventFeed(BaseModel):
    provider: Literal["gdelt", "mock"]
    status: Literal["live", "stale", "fallback"]
    source_label: str
    source_url: HttpUrl | None = None
    as_of: datetime
    fetched_at: datetime
    cached: bool = False
    cache_ttl_seconds: int = Field(ge=0)
    window: Literal["24h", "7d"]
    events: list[RiskEvent]
    warnings: list[str]
