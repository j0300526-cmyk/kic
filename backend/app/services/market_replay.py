import asyncio
import math
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import httpx

from app.config import get_settings
from app.schemas.market_replay import MarketReplay, MarketReplayPoint, ReplayAssetValues, ReplayRange


@dataclass(frozen=True)
class ReplayInstrument:
    asset_id: str
    symbol: str
    label: str


REPLAY_INSTRUMENTS = (
    ReplayInstrument("us_equity", "SPY", "미국 주식"),
    ReplayInstrument("us_treasury", "IEF", "미국 국채"),
    ReplayInstrument("gold", "GLD", "금"),
    ReplayInstrument("cash", "BIL", "현금 대용 단기국채"),
)

_cache: dict[ReplayRange, MarketReplay] = {}
_cache_expires_at: dict[ReplayRange, float] = {}
_cache_lock = asyncio.Lock()


def parse_yahoo_history(payload: dict[str, Any]) -> dict[date, float]:
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators", {})
    adjusted = (indicators.get("adjclose") or [{}])[0].get("adjclose") or []
    closes = (indicators.get("quote") or [{}])[0].get("close") or []
    values = adjusted if len(adjusted) == len(timestamps) else closes
    history: dict[date, float] = {}
    for timestamp, raw_value in zip(timestamps, values, strict=False):
        if raw_value is None:
            continue
        value = float(raw_value)
        if not math.isfinite(value) or value <= 0:
            continue
        history[datetime.fromtimestamp(int(timestamp), tz=timezone.utc).date()] = value
    if len(history) < 2:
        raise ValueError("Yahoo Finance 역사 가격이 충분하지 않습니다.")
    return history


def build_replay_points(histories: dict[str, dict[date, float]]) -> list[MarketReplayPoint]:
    asset_ids = [instrument.asset_id for instrument in REPLAY_INSTRUMENTS]
    common_dates = sorted(set.intersection(*(set(histories[asset_id]) for asset_id in asset_ids)))
    if len(common_dates) < 2:
        raise ValueError("자산별 공통 거래일이 충분하지 않습니다.")
    first = {asset_id: histories[asset_id][common_dates[0]] for asset_id in asset_ids}
    points = []
    for point_date in common_dates:
        prices = {asset_id: histories[asset_id][point_date] for asset_id in asset_ids}
        normalized = {
            asset_id: round(prices[asset_id] / first[asset_id] * 100, 8)
            for asset_id in asset_ids
        }
        points.append(MarketReplayPoint(
            date=point_date,
            prices=ReplayAssetValues(**prices),
            normalized=ReplayAssetValues(**normalized),
        ))
    return points


async def _fetch_history(
    client: httpx.AsyncClient,
    instrument: ReplayInstrument,
    replay_range: ReplayRange,
) -> tuple[str, dict[date, float]]:
    encoded_symbol = quote(instrument.symbol, safe="")
    response = await client.get(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded_symbol}",
        params={"interval": "1d", "range": replay_range, "events": "div,splits"},
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("chart", {}).get("error") or not payload.get("chart", {}).get("result"):
        raise ValueError(f"Yahoo Finance 응답에 {instrument.symbol} 역사 가격이 없습니다.")
    return instrument.asset_id, parse_yahoo_history(payload)


async def _fetch_replay(replay_range: ReplayRange) -> list[MarketReplayPoint]:
    settings = get_settings()
    timeout = httpx.Timeout(settings.market_data_timeout_seconds)
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AlphaMix/0.1; educational prototype)",
    }
    async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
        rows = await asyncio.gather(*(
            _fetch_history(client, instrument, replay_range)
            for instrument in REPLAY_INSTRUMENTS
        ))
    points = build_replay_points(dict(rows))
    if len(points) < 30:
        raise ValueError("역사적 리플레이에 필요한 공통 관측치가 부족합니다.")
    return points


def _fallback_points(replay_range: ReplayRange) -> list[MarketReplayPoint]:
    count = {"6mo": 126, "1y": 252, "3y": 756}[replay_range]
    point_date = date(2026, 10, 31)
    dates: list[date] = []
    while len(dates) < count:
        if point_date.weekday() < 5:
            dates.append(point_date)
        point_date -= timedelta(days=1)
    dates.reverse()

    bases = {"us_equity": 580.0, "us_treasury": 96.0, "gold": 255.0, "cash": 91.0}
    histories: dict[str, dict[date, float]] = {asset_id: {} for asset_id in bases}
    for index, current_date in enumerate(dates):
        factors = {
            "us_equity": 1 + 0.00042 * index + 0.045 * math.sin(index / 18) + 0.012 * math.sin(index / 5),
            "us_treasury": 1 + 0.00012 * index + 0.020 * math.sin(index / 26 + 1.1),
            "gold": 1 + 0.00031 * index + 0.035 * math.sin(index / 22 + 2.0),
            "cash": 1 + 0.00013 * index,
        }
        for asset_id, base in bases.items():
            histories[asset_id][current_date] = base * factors[asset_id]
    return build_replay_points(histories)


async def get_market_replay(
    replay_range: ReplayRange = "1y",
    *,
    force_refresh: bool = False,
) -> MarketReplay:
    settings = get_settings()
    cached = _cache.get(replay_range)
    if not force_refresh and cached is not None and time.monotonic() < _cache_expires_at.get(replay_range, 0):
        return cached.model_copy(update={"cached": True})

    async with _cache_lock:
        cached = _cache.get(replay_range)
        if not force_refresh and cached is not None and time.monotonic() < _cache_expires_at.get(replay_range, 0):
            return cached.model_copy(update={"cached": True})
        fetched_at = datetime.now(timezone.utc)
        proxy_symbols = {instrument.asset_id: instrument.symbol for instrument in REPLAY_INSTRUMENTS}
        try:
            points = await _fetch_replay(replay_range)
            replay = MarketReplay(
                provider="yahoo_finance",
                status="historical",
                source_label="Yahoo Finance",
                source_url="https://finance.yahoo.com/",
                as_of=points[-1].date,
                fetched_at=fetched_at,
                cache_ttl_seconds=settings.market_history_cache_ttl_seconds,
                range=replay_range,
                proxy_symbols=proxy_symbols,
                points=points,
                notice="Yahoo Finance 조정 종가 기반 역사 가격입니다. 현재 TPA 비중을 고정 적용한 리플레이이며 실제 과거 운용 성과가 아닙니다.",
                warnings=["거래비용·세금·리밸런싱과 과거 Agent 판단은 포함하지 않습니다."],
            )
            _cache[replay_range] = replay
            _cache_expires_at[replay_range] = time.monotonic() + settings.market_history_cache_ttl_seconds
            return replay
        except (httpx.HTTPError, KeyError, TypeError, ValueError, IndexError):
            if cached is not None:
                return cached.model_copy(update={
                    "status": "stale",
                    "cached": True,
                    "notice": "Yahoo Finance 갱신 실패로 마지막 정상 역사 가격을 표시합니다.",
                })
            points = _fallback_points(replay_range)
            fallback_ttl = min(settings.market_history_cache_ttl_seconds, 300)
            replay = MarketReplay(
                provider="mock",
                status="fallback",
                source_label="AlphaMix 모의 역사 데이터",
                as_of=points[-1].date,
                fetched_at=fetched_at,
                cache_ttl_seconds=fallback_ttl,
                range=replay_range,
                proxy_symbols=proxy_symbols,
                points=points,
                notice="Yahoo Finance 연결 실패로 결정론적 모의 가격을 표시합니다. 실제 역사 가격이 아닙니다.",
                warnings=["모의 데이터이며 투자 성과나 백테스트 결과로 해석할 수 없습니다."],
            )
            _cache[replay_range] = replay
            _cache_expires_at[replay_range] = time.monotonic() + fallback_ttl
            return replay


def reset_market_replay_cache() -> None:
    _cache.clear()
    _cache_expires_at.clear()
