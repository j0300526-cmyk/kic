import asyncio
import hashlib
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, cast

import httpx

from app.config import get_settings
from app.schemas.risk_events import RiskEvent, RiskEventFeed


EventType = Literal["conflict", "policy", "trade", "macro"]


@dataclass(frozen=True)
class LocationRule:
    name: str
    latitude: float
    longitude: float
    aliases: tuple[str, ...]


LOCATION_RULES = (
    LocationRule("우크라이나", 50.4501, 30.5234, ("ukraine", "kyiv", "kiev")),
    LocationRule("러시아", 55.7558, 37.6173, ("russia", "moscow", "kremlin")),
    LocationRule("이스라엘·가자", 31.7683, 35.2137, ("israel", "gaza", "tel aviv", "jerusalem")),
    LocationRule("이란", 35.6892, 51.3890, ("iran", "tehran")),
    LocationRule("호르무즈 해협", 26.5667, 56.2500, ("hormuz", "persian gulf")),
    LocationRule("홍해", 20.0000, 38.0000, ("red sea", "houthi", "yemen")),
    LocationRule("중국", 39.9042, 116.4074, ("china", "beijing")),
    LocationRule("대만", 25.0330, 121.5654, ("taiwan", "taipei")),
    LocationRule("대한민국", 37.5665, 126.9780, ("south korea", "seoul", "korean peninsula")),
    LocationRule("일본", 35.6762, 139.6503, ("japan", "tokyo")),
    LocationRule("미국", 38.9072, -77.0369, ("united states", "washington", "federal reserve", "the fed")),
    LocationRule("유럽연합", 50.8503, 4.3517, ("european union", "brussels", "ecb", "eurozone")),
    LocationRule("독일", 52.5200, 13.4050, ("germany", "berlin")),
    LocationRule("영국", 51.5072, -0.1276, ("united kingdom", "britain", "london", "bank of england")),
    LocationRule("인도", 28.6139, 77.2090, ("india", "new delhi")),
    LocationRule("수단", 15.5007, 32.5599, ("sudan", "khartoum")),
    LocationRule("콩고민주공화국", -4.4419, 15.2663, ("democratic republic of congo", "dr congo", "kinshasa")),
)

TYPE_TERMS: dict[EventType, tuple[str, ...]] = {
    "conflict": ("war", "conflict", "missile", "military", "attack", "ceasefire", "nuclear", "troops", "sanctions"),
    "policy": ("election", "policy", "regulation", "government", "central bank", "federal reserve", "ecb", "rate decision"),
    "trade": ("tariff", "trade war", "export control", "import", "supply chain", "embargo"),
    "macro": ("inflation", "recession", "gdp", "growth", "interest rate", "employment", "jobs", "currency", "oil price"),
}

AGENT_IMPACTS = {
    "conflict": {"macro": 0.35, "valuation": 0.10, "flow": 0.30, "risk": 0.78, "liquidity": 0.45, "geopolitical": 0.95},
    "policy": {"macro": 0.62, "valuation": 0.38, "flow": 0.28, "risk": 0.48, "liquidity": 0.20, "geopolitical": 0.62},
    "trade": {"macro": 0.72, "valuation": 0.35, "flow": 0.42, "risk": 0.55, "liquidity": 0.25, "geopolitical": 0.70},
    "macro": {"macro": 0.92, "valuation": 0.48, "flow": 0.35, "risk": 0.52, "liquidity": 0.30, "geopolitical": 0.15},
}

ASSET_IMPACTS = {
    "conflict": {"us_equity": -0.60, "us_treasury": 0.32, "gold": 0.78, "cash": 0.40},
    "policy": {"us_equity": -0.25, "us_treasury": 0.20, "gold": 0.22, "cash": 0.12},
    "trade": {"us_equity": -0.48, "us_treasury": 0.15, "gold": 0.36, "cash": 0.24},
    "macro": {"us_equity": -0.22, "us_treasury": -0.28, "gold": 0.30, "cash": 0.18},
}

RATIONALE = {
    "conflict": "지정학적 충격과 위험회피 수요가 주식에는 부담, 금·국채·현금에는 방어 수요로 작용할 수 있습니다.",
    "policy": "정책 불확실성은 할인율과 위험 프리미엄을 바꿔 자산 전반의 재평가를 유발할 수 있습니다.",
    "trade": "관세·수출통제는 성장과 공급망 비용에 영향을 주어 주식과 인플레이션 민감 자산을 움직일 수 있습니다.",
    "macro": "물가·성장·금리 변화는 기대수익률과 채권 듀레이션, 현금 선호에 직접 영향을 줄 수 있습니다.",
}

_cache: dict[str, RiskEventFeed] = {}
_cache_expires_at: dict[str, float] = {}
_cache_lock = asyncio.Lock()


def classify_event(title: str) -> tuple[EventType, list[str]]:
    lowered = title.casefold()
    matches: dict[EventType, list[str]] = {
        event_type: [term for term in terms if term in lowered]
        for event_type, terms in TYPE_TERMS.items()
    }
    priority: tuple[EventType, ...] = ("conflict", "trade", "macro", "policy")
    event_type = max(priority, key=lambda item: (len(matches[item]), -priority.index(item)))
    if not matches[event_type]:
        event_type = "policy"
    keywords = [term for terms in matches.values() for term in terms]
    return event_type, keywords[:6]


def locate_event(title: str) -> tuple[str | None, float | None, float | None, float]:
    lowered = title.casefold()
    for rule in LOCATION_RULES:
        if any(re.search(rf"\b{re.escape(alias)}\b", lowered) for alias in rule.aliases):
            return rule.name, rule.latitude, rule.longitude, 0.88
    return None, None, None, 0.0


def _severity(event_type: EventType, title: str) -> int:
    lowered = title.casefold()
    score = 2 if event_type in {"policy", "macro"} else 3
    if any(term in lowered for term in ("nuclear", "missile", "attack", "war", "emergency")):
        score += 1
    if any(term in lowered for term in ("escalat", "crisis", "invasion", "shutdown")):
        score += 1
    return min(score, 5)


def _published_at(value: str | None) -> datetime:
    if value:
        for date_format in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
            try:
                return datetime.strptime(value, date_format).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return datetime.now(timezone.utc)


def _event_from_article(article: dict[str, Any]) -> RiskEvent:
    title = str(article.get("title") or "제목 없는 글로벌 뉴스").strip()
    url = str(article.get("url") or "").strip() or None
    event_type, keywords = classify_event(title)
    location_name, latitude, longitude, confidence = locate_event(title)
    publisher = str(article.get("domain") or "GDELT 수집 매체")
    event_id = hashlib.sha256(f"{url or publisher}:{title}".encode("utf-8")).hexdigest()[:16]
    type_label = {"conflict": "분쟁", "policy": "정책", "trade": "무역", "macro": "거시경제"}[event_type]
    return RiskEvent(
        id=event_id,
        event_type=event_type,
        severity=_severity(event_type, title),
        title=title,
        summary=f"{type_label} 관련 글로벌 보도입니다. 원문과 복수 출처를 함께 확인하세요.",
        url=url,
        publisher=publisher,
        published_at=_published_at(article.get("seendate")),
        source_country=article.get("sourcecountry"),
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
        location_confidence=confidence,
        keywords=keywords,
        agent_impacts=AGENT_IMPACTS[event_type],
        asset_impacts=ASSET_IMPACTS[event_type],
        rationale=RATIONALE[event_type],
        data_mode="live",
    )


def parse_gdelt_articles(payload: dict[str, Any]) -> list[RiskEvent]:
    seen: set[str] = set()
    events: list[RiskEvent] = []
    for article in payload.get("articles", []):
        event = _event_from_article(article)
        normalized_title = re.sub(r"\W+", "", event.title.casefold())
        if not normalized_title or normalized_title in seen:
            continue
        seen.add(normalized_title)
        events.append(event)
    return sorted(events, key=lambda item: (item.severity, item.published_at), reverse=True)[:30]


def _fallback_events() -> list[RiskEvent]:
    now = datetime.now(timezone.utc)
    rows = [
        ("mock-ukraine", "conflict", 5, "우크라이나 전선 긴장과 추가 제재 가능성", "우크라이나", 50.4501, 30.5234, 1),
        ("mock-hormuz", "conflict", 5, "호르무즈 해협 운송 차질 위험 확대", "호르무즈 해협", 26.5667, 56.2500, 2),
        ("mock-taiwan", "conflict", 4, "대만해협 군사 활동과 반도체 공급망 우려", "대만", 25.0330, 121.5654, 3),
        ("mock-us-fed", "macro", 4, "미 연준 금리 경로와 인플레이션 재평가", "미국", 38.9072, -77.0369, 4),
        ("mock-eu-trade", "trade", 3, "유럽연합 무역 규제와 관세 논의", "유럽연합", 50.8503, 4.3517, 5),
        ("mock-china", "macro", 3, "중국 성장 둔화와 정책 부양 기대", "중국", 39.9042, 116.4074, 6),
        ("mock-israel", "conflict", 4, "이스라엘·가자 휴전 협상 불확실성", "이스라엘·가자", 31.7683, 35.2137, 7),
        ("mock-japan", "policy", 2, "일본은행 통화정책 정상화 경로", "일본", 35.6762, 139.6503, 8),
    ]
    events = []
    for event_id, event_type, severity, title, location, latitude, longitude, hours_ago in rows:
        typed_event_type = cast(EventType, event_type)
        events.append(RiskEvent(
            id=event_id,
            event_type=typed_event_type,
            severity=severity,
            title=title,
            summary="외부 뉴스 연결 실패 시 화면 검증을 위한 결정론적 모의 이벤트입니다.",
            publisher="AlphaMix 모의 데이터",
            published_at=now - timedelta(hours=hours_ago),
            location_name=location,
            latitude=latitude,
            longitude=longitude,
            location_confidence=1.0,
            keywords=[],
            agent_impacts=AGENT_IMPACTS[typed_event_type],
            asset_impacts=ASSET_IMPACTS[typed_event_type],
            rationale=RATIONALE[typed_event_type],
            data_mode="mock",
        ))
    return events


async def _fetch_gdelt(window: Literal["24h", "7d"]) -> list[RiskEvent]:
    settings = get_settings()
    query = "(conflict OR sanctions OR ceasefire OR missile OR inflation OR tariff OR centralbank OR recession)"
    timeout = httpx.Timeout(settings.news_data_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (compatible; AlphaMix/0.1)"}) as client:
        response = await client.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            params={
                "query": query,
                "mode": "artlist",
                "format": "json",
                "maxrecords": 40,
                "timespan": window,
                "sort": "datedesc",
            },
        )
        response.raise_for_status()
        events = parse_gdelt_articles(response.json())
        if len(events) < 4:
            raise ValueError("GDELT가 충분한 이벤트를 반환하지 않았습니다.")
        return events


async def get_risk_event_feed(window: Literal["24h", "7d"] = "24h", *, force_refresh: bool = False) -> RiskEventFeed:
    settings = get_settings()
    now_monotonic = time.monotonic()
    cached = _cache.get(window)
    if not force_refresh and cached is not None and now_monotonic < _cache_expires_at.get(window, 0):
        return cached.model_copy(update={"cached": True})

    async with _cache_lock:
        cached = _cache.get(window)
        if not force_refresh and cached is not None and time.monotonic() < _cache_expires_at.get(window, 0):
            return cached.model_copy(update={"cached": True})
        fetched_at = datetime.now(timezone.utc)
        try:
            events = await _fetch_gdelt(window)
            feed = RiskEventFeed(
                provider="gdelt",
                status="live",
                source_label="GDELT DOC 2.0",
                source_url="https://www.gdeltproject.org/",
                as_of=max(event.published_at for event in events),
                fetched_at=fetched_at,
                cache_ttl_seconds=settings.news_data_cache_ttl_seconds,
                window=window,
                events=events,
                warnings=["자동 분류·위치 추정 결과이며 원문과 복수 출처를 교차 확인해야 합니다."],
            )
            _cache[window] = feed
            _cache_expires_at[window] = time.monotonic() + settings.news_data_cache_ttl_seconds
            return feed
        except (httpx.HTTPError, KeyError, TypeError, ValueError, IndexError):
            if cached is not None:
                return cached.model_copy(update={
                    "status": "stale",
                    "cached": True,
                    "warnings": ["GDELT 갱신 실패로 마지막 정상 이벤트를 표시합니다."],
                })
            events = _fallback_events()
            fallback_ttl = min(settings.news_data_cache_ttl_seconds, 300)
            feed = RiskEventFeed(
                provider="mock",
                status="fallback",
                source_label="AlphaMix 모의 이벤트",
                as_of=max(event.published_at for event in events),
                fetched_at=fetched_at,
                cache_ttl_seconds=fallback_ttl,
                window=window,
                events=events,
                warnings=["GDELT 연결 실패로 모의 이벤트를 표시합니다. 실제 뉴스가 아닙니다."],
            )
            _cache[window] = feed
            _cache_expires_at[window] = time.monotonic() + fallback_ttl
            return feed


def reset_risk_event_cache() -> None:
    _cache.clear()
    _cache_expires_at.clear()
