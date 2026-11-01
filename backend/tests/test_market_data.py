from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api import market as market_api
from app.main import app
from app.schemas.market import MarketSnapshot, MarketTickerItem
from app.services.market_data import INSTRUMENTS, _parse_quote


def yahoo_payload(*, price: float, previous_close: float, timestamp: int = 1793404800, closes: list[float | None] | None = None) -> dict:
    return {
        "chart": {
            "result": [{
                "meta": {
                    "currency": "USD",
                    "regularMarketPrice": price,
                    "chartPreviousClose": previous_close,
                    "regularMarketTime": timestamp,
                },
                "indicators": {"quote": [{"close": closes or []}]},
            }],
            "error": None,
        }
    }


def test_yahoo_quote_parser_formats_percent_and_basis_points() -> None:
    sp500 = _parse_quote(INSTRUMENTS[0], yahoo_payload(
        price=7580.07,
        previous_close=7623.68,
        closes=[7722.60, 7743.98, 7720.39, 7580.07],
    ))
    us10y = _parse_quote(INSTRUMENTS[1], yahoo_payload(
        price=4.929,
        previous_close=4.986,
        closes=[4.993, 5.045, 4.989, 4.929],
    ))

    assert sp500.formatted_value == "7,580.07"
    assert sp500.formatted_change == "-1.82%"
    assert sp500.direction == "negative"
    assert us10y.formatted_value == "4.929%"
    assert us10y.formatted_change == "-6.0bp"


def test_market_snapshot_api_contract(monkeypatch) -> None:
    now = datetime(2026, 10, 31, 20, 0, tzinfo=timezone.utc)
    items = [
        MarketTickerItem(
            id=spec.id,
            symbol=spec.symbol,
            label=spec.label,
            value=100.0,
            formatted_value="100.00",
            change=1.0,
            change_percent=1.0,
            formatted_change="+1.00%",
            direction="positive",
            currency="USD",
            market_time=now,
            source_url="https://finance.yahoo.com/",
        )
        for spec in INSTRUMENTS
    ]
    snapshot = MarketSnapshot(
        provider="yahoo_finance",
        status="delayed",
        source_label="Yahoo Finance",
        source_url="https://finance.yahoo.com/",
        as_of=now,
        fetched_at=now,
        cache_ttl_seconds=60,
        items=items,
        notice="테스트 지연 시세",
    )

    async def fake_snapshot() -> MarketSnapshot:
        return snapshot

    monkeypatch.setattr(market_api, "get_market_snapshot", fake_snapshot)
    with TestClient(app) as client:
        response = client.get("/api/v1/market/snapshot")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "yahoo_finance"
    assert body["status"] == "delayed"
    assert {item["id"] for item in body["items"]} == {"sp500", "us10y", "gold", "dxy"}
