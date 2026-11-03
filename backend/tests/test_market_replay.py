from datetime import date, datetime, timezone

from fastapi.testclient import TestClient

from app.api import market as market_api
from app.main import app
from app.schemas.market_replay import MarketReplay, MarketReplayPoint, ReplayAssetValues
from app.services.market_replay import build_replay_points, parse_yahoo_history


def yahoo_history_payload() -> dict:
    return {
        "chart": {
            "result": [{
                "timestamp": [1793404800, 1793491200],
                "indicators": {
                    "adjclose": [{"adjclose": [100.0, 102.0]}],
                    "quote": [{"close": [99.0, 101.0]}],
                },
            }],
            "error": None,
        }
    }


def test_yahoo_history_parser_prefers_adjusted_close() -> None:
    history = parse_yahoo_history(yahoo_history_payload())

    assert list(history.values()) == [100.0, 102.0]


def test_replay_points_align_assets_and_normalize_start_to_100() -> None:
    dates = [date(2026, 10, 30), date(2026, 10, 31)]
    histories = {
        "us_equity": {dates[0]: 100.0, dates[1]: 110.0},
        "us_treasury": {dates[0]: 100.0, dates[1]: 99.0},
        "gold": {dates[0]: 200.0, dates[1]: 210.0},
        "cash": {dates[0]: 50.0, dates[1]: 50.1},
    }
    points = build_replay_points(histories)

    assert len(points) == 2
    assert points[0].normalized.us_equity == 100.0
    assert points[1].normalized.us_equity == 110.0
    assert points[1].normalized.gold == 105.0


def test_market_replay_api_contract(monkeypatch) -> None:
    now = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)
    values = ReplayAssetValues(us_equity=100, us_treasury=100, gold=100, cash=100)
    next_values = ReplayAssetValues(us_equity=101, us_treasury=99, gold=102, cash=100.1)
    replay = MarketReplay(
        provider="yahoo_finance",
        status="historical",
        source_label="Yahoo Finance",
        source_url="https://finance.yahoo.com/",
        as_of=date(2026, 10, 31),
        fetched_at=now,
        cache_ttl_seconds=1800,
        range="1y",
        proxy_symbols={"us_equity": "SPY", "us_treasury": "IEF", "gold": "GLD", "cash": "BIL"},
        points=[
            MarketReplayPoint(date=date(2026, 10, 30), prices=values, normalized=values),
            MarketReplayPoint(date=date(2026, 10, 31), prices=next_values, normalized=next_values),
        ],
        notice="테스트 역사 가격",
    )

    async def fake_replay(_: str = "1y") -> MarketReplay:
        return replay

    monkeypatch.setattr(market_api, "get_market_replay", fake_replay)
    with TestClient(app) as client:
        response = client.get("/api/v1/market/replay?range=1y")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "yahoo_finance"
    assert body["range"] == "1y"
    assert len(body["points"]) == 2
