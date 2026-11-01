from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api import risk_events as risk_events_api
from app.main import app
from app.schemas.risk_events import RiskEvent, RiskEventFeed
from app.services.risk_events import classify_event, locate_event, parse_gdelt_articles


def test_classification_and_location_are_deterministic() -> None:
    event_type, keywords = classify_event("Missile attack raises conflict risk in Ukraine")
    location_name, latitude, longitude, confidence = locate_event("Missile attack raises conflict risk in Ukraine")

    assert event_type == "conflict"
    assert "missile" in keywords
    assert location_name == "우크라이나"
    assert latitude == 50.4501
    assert longitude == 30.5234
    assert confidence > 0.8


def test_gdelt_articles_are_normalized_and_deduplicated() -> None:
    payload = {
        "articles": [
            {
                "title": "Taiwan tariff conflict adds pressure to chip supply chain",
                "url": "https://example.com/taiwan-risk",
                "domain": "example.com",
                "seendate": "20261101T120000Z",
                "sourcecountry": "United States",
            },
            {
                "title": "Taiwan tariff conflict adds pressure to chip supply chain",
                "url": "https://example.com/taiwan-risk-copy",
                "domain": "example.com",
                "seendate": "20261101T115900Z",
            },
        ]
    }

    events = parse_gdelt_articles(payload)
    assert len(events) == 1
    event = events[0]
    assert event.event_type == "trade"
    assert event.location_name == "대만"
    assert event.data_mode == "live"
    assert event.asset_impacts["gold"] > 0
    assert event.asset_impacts["us_equity"] < 0


def test_risk_events_api_contract(monkeypatch) -> None:
    now = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
    event = RiskEvent(
        id="event-1",
        event_type="macro",
        severity=3,
        title="Federal Reserve reviews inflation outlook",
        summary="거시경제 관련 보도",
        url="https://example.com/fed",
        publisher="example.com",
        published_at=now,
        source_country="United States",
        location_name="미국",
        latitude=38.9072,
        longitude=-77.0369,
        location_confidence=0.88,
        keywords=["inflation", "federal reserve"],
        agent_impacts={"macro": 0.9, "valuation": 0.4, "flow": 0.3, "risk": 0.5, "liquidity": 0.3, "geopolitical": 0.1},
        asset_impacts={"us_equity": -0.2, "us_treasury": -0.3, "gold": 0.3, "cash": 0.2},
        rationale="금리와 기대수익률에 영향을 줄 수 있습니다.",
        data_mode="live",
    )
    feed = RiskEventFeed(
        provider="gdelt",
        status="live",
        source_label="GDELT DOC 2.0",
        source_url="https://www.gdeltproject.org/",
        as_of=now,
        fetched_at=now,
        cache_ttl_seconds=900,
        window="24h",
        events=[event],
        warnings=[],
    )

    async def fake_feed(window: str) -> RiskEventFeed:
        assert window == "24h"
        return feed

    monkeypatch.setattr(risk_events_api, "get_risk_event_feed", fake_feed)
    with TestClient(app) as client:
        response = client.get("/api/v1/risk/events?window=24h")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "gdelt"
    assert body["events"][0]["location_name"] == "미국"
    assert set(body["events"][0]["asset_impacts"]) == {"us_equity", "us_treasury", "gold", "cash"}
