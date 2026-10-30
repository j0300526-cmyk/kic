"""Deterministic inputs for the six AlphaMix specialist agents."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from app.schemas.agent import AgentAnalysis
from app.schemas.common import AGENT_IDS, ASSET_IDS

MOCK_AS_OF = datetime(2026, 10, 31, tzinfo=UTC)

_MOCK_ANALYSES: dict[str, dict[str, Any]] = {
    "macro": {
        "agent_name": "Macro Agent",
        "scores": {"us_equity": 0.35, "us_treasury": 0.15, "gold": 0.30, "cash": -0.25},
        "rationale": "완만한 성장과 안정되는 물가를 기본 시나리오로 두되, 높은 실질금리를 고려해 금과 국채의 분산 효과를 유지한다.",
        "confidence": 0.78,
        "uncertainties": ["표본 거시지표이며 실시간 발표치와 차이가 날 수 있다.", "통화정책 전환 시점은 예측 오차가 크다."],
        "source": ("AlphaMix sample macro indicators", "Federal Reserve / BLS sample"),
    },
    "valuation": {
        "agent_name": "Valuation Agent",
        "scores": {"us_equity": 0.60, "us_treasury": -0.10, "gold": -0.20, "cash": -0.25},
        "rationale": "현금흐름 성장률과 장기 할인율의 표본 가정을 함께 적용하면 미국 주식의 상대 기대수익이 가장 높다.",
        "confidence": 0.72,
        "uncertainties": ["멀티플 평균회귀 속도는 시장 국면에 따라 달라진다.", "표본 이익 추정치는 실제 컨센서스가 아니다."],
        "source": ("AlphaMix sample valuation sheet", "Public index fundamentals sample"),
    },
    "flow": {
        "agent_name": "Flow Agent",
        "scores": {"us_equity": 0.25, "us_treasury": -0.15, "gold": 0.40, "cash": -0.20},
        "rationale": "표본 모멘텀과 거래량은 위험자산 수요가 유지됨을 보이며, 금 ETF의 상대적 유입 강도가 가장 높다.",
        "confidence": 0.68,
        "uncertainties": ["거래 흐름은 빠르게 반전될 수 있다.", "표본 데이터는 장외 포지션을 포함하지 않는다."],
        "source": ("AlphaMix sample flow tape", "Exchange volume / ETF flow sample"),
    },
    "risk": {
        "agent_name": "Risk Agent",
        "scores": {"us_equity": -0.55, "us_treasury": 0.55, "gold": 0.30, "cash": 0.50},
        "rationale": "표본 변동성과 스트레스 상관관계에서 주식의 기여 위험이 집중되어 있어 국채·금·현금으로 꼬리위험을 분산한다.",
        "confidence": 0.84,
        "uncertainties": ["과거 공분산은 위기 국면의 비선형 관계를 완전히 설명하지 못한다.", "극단 손실 추정에는 제한된 표본을 사용한다."],
        "source": ("AlphaMix sample risk model", "Synthetic daily return history"),
    },
    "liquidity": {
        "agent_name": "Liquidity Agent",
        "scores": {"us_equity": 0.15, "us_treasury": 0.35, "gold": -0.05, "cash": 0.70},
        "rationale": "현금과 미국 국채는 표본 청산기간과 호가 비용에서 우수하며, 금은 스트레스 시 스프레드 확대를 반영한다.",
        "confidence": 0.88,
        "uncertainties": ["실제 거래비용은 주문 규모와 거래 시간에 좌우된다.", "시장 폐쇄나 결제 지연은 표본에 포함되지 않는다."],
        "source": ("AlphaMix sample liquidity ladder", "Synthetic bid-ask and ADV sample"),
    },
    "geopolitical": {
        "agent_name": "Geopolitical Agent",
        "scores": {"us_equity": -0.35, "us_treasury": 0.25, "gold": 0.75, "cash": 0.20},
        "rationale": "무역·분쟁·정책 불확실성의 표본 스트레스 시나리오는 금의 헤지 효용을 높이고 주식에는 할인 요인을 부여한다.",
        "confidence": 0.65,
        "uncertainties": ["정치 사건의 발생 확률과 시장 충격은 구조적으로 추정이 어렵다.", "시나리오는 실제 뉴스 피드가 아닌 공모전용 표본이다."],
        "source": ("AlphaMix sample geopolitical scenarios", "Synthetic policy-risk events"),
    },
}


def mock_analysis(agent_id: str) -> AgentAnalysis:
    """Return a fresh deterministic analysis for one specialist."""

    if agent_id not in AGENT_IDS:
        raise KeyError(f"Unknown agent: {agent_id}")
    item = deepcopy(_MOCK_ANALYSES[agent_id])
    source_title, publisher = item.pop("source")
    return AgentAnalysis(
        agent_id=agent_id,
        agent_name=item["agent_name"],
        mode="mock",
        assets=list(ASSET_IDS),
        scores=item["scores"],
        sources=[{"title": source_title, "publisher": publisher, "url": None, "as_of": MOCK_AS_OF.date()}],
        rationale=item["rationale"],
        confidence=item["confidence"],
        uncertainties=item["uncertainties"],
        as_of=MOCK_AS_OF,
    )

