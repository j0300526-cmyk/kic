from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, HttpUrl


AssetId = Literal["us_equity", "us_treasury", "gold", "cash"]
AgentId = Literal[
    "macro",
    "valuation",
    "flow",
    "risk",
    "liquidity",
    "geopolitical",
]

ASSET_IDS: tuple[AssetId, ...] = (
    "us_equity",
    "us_treasury",
    "gold",
    "cash",
)
AGENT_IDS: tuple[AgentId, ...] = (
    "macro",
    "valuation",
    "flow",
    "risk",
    "liquidity",
    "geopolitical",
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceReference(StrictModel):
    title: str
    publisher: str
    url: HttpUrl | None = None
    as_of: date


class Asset(StrictModel):
    id: AssetId
    name: str

