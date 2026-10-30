from fastapi import APIRouter

from app.data.assumptions import DATA_AS_OF


router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("")
def get_overview() -> dict[str, object]:
    return {
        "mode": "mock",
        "data_as_of": DATA_AS_OF,
        "market_snapshot": [
            {"label": "US 10Y", "value": "4.18%", "change": "+4 bp", "tone": "negative"},
            {"label": "S&P 500", "value": "5,822", "change": "+0.6%", "tone": "positive"},
            {"label": "Gold", "value": "$2,744", "change": "+0.3%", "tone": "positive"},
            {"label": "DXY", "value": "104.2", "change": "-0.2%", "tone": "neutral"},
        ],
        "baseline_allocation": {
            "us_equity": 0.45,
            "us_treasury": 0.30,
            "gold": 0.15,
            "cash": 0.10,
        },
        "notices": [
            "Sample market values are deterministic mock data, not live quotes.",
            "AlphaMix provides decision support and does not execute trades.",
        ],
    }

