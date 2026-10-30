import math

from app.exceptions import AlphaMixError
from app.schemas.agent import AgentAnalysis
from app.schemas.common import AGENT_IDS, ASSET_IDS, AgentId, AssetId


def normalize_agent_weights(
    raw_weights: dict[AgentId, float],
    enabled_agents: list[AgentId],
) -> dict[AgentId, float]:
    """Normalize enabled faders; disabled agents always contribute zero."""
    enabled = set(enabled_agents)
    selected: dict[AgentId, float] = {}
    for agent_id in AGENT_IDS:
        value = float(raw_weights.get(agent_id, 0.0)) if agent_id in enabled else 0.0
        if not math.isfinite(value) or value < 0 or value > 100:
            raise AlphaMixError(
                "VALIDATION_ERROR",
                "Agent weights must be finite values between 0 and 100.",
                details={agent_id: value},
            )
        selected[agent_id] = value

    total = sum(selected.values())
    if total <= 0:
        raise AlphaMixError(
            "ZERO_AGENT_WEIGHT",
            "At least one enabled agent must have a positive weight.",
            details={"agent_weights": "sum must be greater than zero"},
        )

    normalized = {agent_id: value / total for agent_id, value in selected.items()}
    # Floating-point guard: force the largest component to close exactly to one.
    largest = max(normalized, key=normalized.get)
    normalized[largest] += 1.0 - sum(normalized.values())
    return normalized


def mix_agent_scores(
    analyses: list[AgentAnalysis],
    normalized_weights: dict[AgentId, float],
) -> dict[AssetId, float]:
    by_agent = {analysis.agent_id: analysis for analysis in analyses}
    missing = [
        agent_id
        for agent_id, weight in normalized_weights.items()
        if weight > 0 and agent_id not in by_agent
    ]
    if missing:
        raise AlphaMixError(
            "ANALYSIS_NOT_FOUND",
            "Analysis is missing for one or more enabled agents.",
            status_code=404,
            details={"agent_ids": missing},
        )

    return {
        asset_id: float(
            sum(
                normalized_weights.get(agent_id, 0.0) * by_agent[agent_id].scores[asset_id]
                for agent_id in by_agent
            )
        )
        for asset_id in ASSET_IDS
    }

