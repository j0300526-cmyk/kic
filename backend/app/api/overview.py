from fastapi import APIRouter

from app.data.assumptions import DATA_AS_OF


router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("")
def get_overview() -> dict[str, object]:
    return {
        "mode": "mock",
        "data_as_of": DATA_AS_OF,
        "market_snapshot": [
            {"label": "미국 10년물", "value": "4.18%", "change": "+4 bp", "tone": "negative"},
            {"label": "S&P 500", "value": "5,822", "change": "+0.6%", "tone": "positive"},
            {"label": "금", "value": "$2,744", "change": "+0.3%", "tone": "positive"},
            {"label": "달러 지수", "value": "104.2", "change": "-0.2%", "tone": "neutral"},
        ],
        "baseline_allocation": {
            "us_equity": 0.45,
            "us_treasury": 0.30,
            "gold": 0.15,
            "cash": 0.10,
        },
        "notices": [
            "시장 수치는 재현 가능한 모의 데이터이며 실시간 시세가 아닙니다.",
            "AlphaMix는 의사결정을 지원하며 거래를 직접 실행하지 않습니다.",
        ],
    }

