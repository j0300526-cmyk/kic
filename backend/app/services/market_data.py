import asyncio
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from app.config import get_settings
from app.schemas.market import MarketSnapshot, MarketTickerItem


@dataclass(frozen=True)
class InstrumentSpec:
    id: str
    symbol: str
    label: str
    prefix: str = ""
    suffix: str = ""
    decimals: int = 2
    change_unit: str = "percent"


INSTRUMENTS = (
    InstrumentSpec("sp500", "^GSPC", "S&P 500"),
    InstrumentSpec("us10y", "^TNX", "미국 10년물", suffix="%", decimals=3, change_unit="bp"),
    InstrumentSpec("gold", "GC=F", "금", prefix="$"),
    InstrumentSpec("dxy", "DX-Y.NYB", "달러 지수"),
)

_cache: MarketSnapshot | None = None
_cache_expires_at = 0.0
_cache_lock = asyncio.Lock()


def _format_number(value: float, spec: InstrumentSpec) -> str:
    return f"{spec.prefix}{value:,.{spec.decimals}f}{spec.suffix}"


def _parse_quote(spec: InstrumentSpec, payload: dict[str, Any]) -> MarketTickerItem:
    result = payload["chart"]["result"][0]
    meta = result["meta"]
    price = float(meta["regularMarketPrice"])
    closes = [
        float(value)
        for value in result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        if value is not None
    ]
    previous_close = None
    for close in reversed(closes):
        if not math.isclose(close, price, rel_tol=1e-6, abs_tol=1e-5):
            previous_close = close
            break
    if previous_close is None:
        previous_close = float(meta.get("previousClose") or meta["chartPreviousClose"])
    change = price - previous_close
    change_percent = change / previous_close * 100 if previous_close else 0.0
    market_time = datetime.fromtimestamp(int(meta["regularMarketTime"]), tz=timezone.utc)

    if spec.change_unit == "bp":
        formatted_change = f"{change * 100:+.1f}bp"
    else:
        formatted_change = f"{change_percent:+.2f}%"

    direction = "positive" if change > 0 else "negative" if change < 0 else "flat"
    encoded_symbol = quote(spec.symbol, safe="")
    return MarketTickerItem(
        id=spec.id,
        symbol=spec.symbol,
        label=spec.label,
        value=price,
        formatted_value=_format_number(price, spec),
        change=change,
        change_percent=change_percent,
        formatted_change=formatted_change,
        direction=direction,
        currency=meta.get("currency"),
        market_time=market_time,
        source_url=f"https://finance.yahoo.com/quote/{encoded_symbol}/",
    )


async def _fetch_quote(client: httpx.AsyncClient, spec: InstrumentSpec) -> MarketTickerItem:
    encoded_symbol = quote(spec.symbol, safe="")
    response = await client.get(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded_symbol}",
        params={"interval": "1d", "range": "5d"},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("chart", {}).get("error") or not payload.get("chart", {}).get("result"):
        raise ValueError(f"Yahoo Finance 응답에 {spec.symbol} 시세가 없습니다.")
    return _parse_quote(spec, payload)


def _fallback_snapshot() -> MarketSnapshot:
    now = datetime.now(timezone.utc)
    fallback_values = {
        "sp500": (5822.14, 0.63),
        "us10y": (4.18, -0.032),
        "gold": (2741.0, 0.41),
        "dxy": (103.87, -0.18),
    }
    items = []
    for spec in INSTRUMENTS:
        value, display_change = fallback_values[spec.id]
        if spec.change_unit == "bp":
            change = display_change
            formatted_change = f"{display_change * 100:+.1f}bp"
            change_percent = 0.0
        else:
            change_percent = display_change
            change = value * display_change / 100
            formatted_change = f"{display_change:+.2f}%"
        items.append(MarketTickerItem(
            id=spec.id,
            symbol=spec.symbol,
            label=spec.label,
            value=value,
            formatted_value=_format_number(value, spec),
            change=change,
            change_percent=change_percent,
            formatted_change=formatted_change,
            direction="positive" if change > 0 else "negative" if change < 0 else "flat",
            currency="USD" if spec.id in {"sp500", "gold", "dxy"} else None,
            market_time=now,
        ))
    return MarketSnapshot(
        provider="mock",
        status="fallback",
        source_label="AlphaMix 샘플 데이터",
        as_of=now,
        fetched_at=now,
        cache_ttl_seconds=0,
        items=items,
        notice="Yahoo Finance 연결 실패로 샘플 시장 데이터를 표시합니다.",
    )


async def get_market_snapshot(*, force_refresh: bool = False) -> MarketSnapshot:
    global _cache, _cache_expires_at
    settings = get_settings()
    now_monotonic = time.monotonic()
    if not force_refresh and _cache is not None and now_monotonic < _cache_expires_at:
        return _cache.model_copy(update={"cached": True})

    async with _cache_lock:
        now_monotonic = time.monotonic()
        if not force_refresh and _cache is not None and now_monotonic < _cache_expires_at:
            return _cache.model_copy(update={"cached": True})

        fetched_at = datetime.now(timezone.utc)
        try:
            timeout = httpx.Timeout(settings.market_data_timeout_seconds)
            headers = {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; AlphaMix/0.1; educational prototype)",
            }
            async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
                items = list(await asyncio.gather(*(_fetch_quote(client, spec) for spec in INSTRUMENTS)))
            snapshot = MarketSnapshot(
                provider="yahoo_finance",
                status="delayed",
                source_label="Yahoo Finance",
                source_url="https://finance.yahoo.com/",
                as_of=max(item.market_time for item in items),
                fetched_at=fetched_at,
                cache_ttl_seconds=settings.market_data_cache_ttl_seconds,
                items=items,
                notice="Yahoo Finance 제공 지연 시세입니다. 거래 또는 투자 실행 가격으로 사용하지 마세요.",
            )
            _cache = snapshot
            _cache_expires_at = time.monotonic() + settings.market_data_cache_ttl_seconds
            return snapshot
        except (httpx.HTTPError, KeyError, TypeError, ValueError, IndexError):
            if _cache is not None:
                return _cache.model_copy(update={
                    "status": "stale",
                    "cached": True,
                    "notice": "Yahoo Finance 갱신에 실패해 마지막 정상 시세를 표시합니다.",
                })
            return _fallback_snapshot()


def reset_market_cache() -> None:
    global _cache, _cache_expires_at
    _cache = None
    _cache_expires_at = 0.0
