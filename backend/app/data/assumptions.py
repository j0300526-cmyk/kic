from datetime import UTC, datetime

import numpy as np

from app.schemas.common import AGENT_IDS, ASSET_IDS, AgentId, AssetId


DATA_AS_OF = datetime(2026, 10, 31, tzinfo=UTC)
MODEL_VERSION = "tpa-v1"

ASSET_NAMES: dict[AssetId, str] = {
    "us_equity": "US Equity",
    "us_treasury": "US Treasury",
    "gold": "Gold",
    "cash": "Cash",
}

BASE_EXPECTED_RETURNS: dict[AssetId, float] = {
    "us_equity": 0.075,
    "us_treasury": 0.042,
    "gold": 0.055,
    "cash": 0.032,
}

VOLATILITY: dict[AssetId, float] = {
    "us_equity": 0.18,
    "us_treasury": 0.07,
    "gold": 0.16,
    "cash": 0.01,
}

CORRELATION = np.array(
    [
        [1.00, -0.15, 0.05, 0.00],
        [-0.15, 1.00, -0.05, 0.00],
        [0.05, -0.05, 1.00, 0.00],
        [0.00, 0.00, 0.00, 1.00],
    ],
    dtype=float,
)
_vol_vector = np.array([VOLATILITY[asset] for asset in ASSET_IDS])
COVARIANCE = np.outer(_vol_vector, _vol_vector) * CORRELATION

SCORE_SENSITIVITY: dict[AssetId, float] = {
    "us_equity": 0.055,
    "us_treasury": 0.035,
    "gold": 0.045,
    "cash": 0.012,
}

DEFAULT_MAX_WEIGHTS: dict[AssetId, float] = {
    "us_equity": 0.65,
    "us_treasury": 0.70,
    "gold": 0.30,
    "cash": 0.40,
}

RISK_PROFILES = {
    "conservative": {"risk_aversion": 10.0, "max_volatility": 0.080},
    "balanced": {"risk_aversion": 5.0, "max_volatility": 0.120},
    "growth": {"risk_aversion": 2.4, "max_volatility": 0.170},
}

PRESETS: dict[str, dict[str, object]] = {
    "balanced": {
        "name": "Balanced",
        "description": "Evenly blends the six institutional lenses.",
        "weights": dict.fromkeys(AGENT_IDS, 100 / len(AGENT_IDS)),
        "enabled_agents": list(AGENT_IDS),
        "risk_tolerance": "balanced",
    },
    "defensive": {
        "name": "Risk Defense",
        "description": "Emphasizes risk, liquidity and geopolitical resilience.",
        "weights": {
            "macro": 10,
            "valuation": 5,
            "flow": 5,
            "risk": 35,
            "liquidity": 30,
            "geopolitical": 15,
        },
        "enabled_agents": list(AGENT_IDS),
        "risk_tolerance": "conservative",
    },
    "value": {
        "name": "Value Investing",
        "description": "Prioritizes valuation and macro regime signals.",
        "weights": {
            "macro": 25,
            "valuation": 45,
            "flow": 5,
            "risk": 10,
            "liquidity": 5,
            "geopolitical": 10,
        },
        "enabled_agents": list(AGENT_IDS),
        "risk_tolerance": "balanced",
    },
}

ASSUMPTIONS = {
    "assets": ASSET_NAMES,
    "base_expected_returns": BASE_EXPECTED_RETURNS,
    "volatility": VOLATILITY,
    "covariance": COVARIANCE,
    "score_sensitivity": SCORE_SENSITIVITY,
    "max_weights": DEFAULT_MAX_WEIGHTS,
    "risk_profiles": RISK_PROFILES,
    "model_version": MODEL_VERSION,
    "data_as_of": DATA_AS_OF,
}

