from uuid import uuid4

import cvxpy as cp
import numpy as np

from app.data.assumptions import (
    BASE_EXPECTED_RETURNS,
    COVARIANCE,
    DATA_AS_OF,
    DEFAULT_MAX_WEIGHTS,
    MODEL_VERSION,
    RISK_PROFILES,
    SCORE_SENSITIVITY,
)
from app.exceptions import AlphaMixError
from app.schemas.common import ASSET_IDS, AssetId
from app.schemas.portfolio import OptimizationRequest, OptimizationResponse
from app.schemas.agent import AnalysisRun
from app.services.mixing import mix_agent_scores, normalize_agent_weights


NUMERICAL_TOLERANCE = 2e-5


def _as_asset_dict(values: np.ndarray) -> dict[AssetId, float]:
    return {asset_id: float(values[index]) for index, asset_id in enumerate(ASSET_IDS)}


def _merged_caps(request: OptimizationRequest) -> dict[AssetId, float]:
    caps = dict(DEFAULT_MAX_WEIGHTS)
    caps.update(request.constraints.max_weights)
    return caps


def optimize_portfolio(
    request: OptimizationRequest,
    analysis_run: AnalysisRun,
) -> OptimizationResponse:
    if request.analysis_run_id != analysis_run.analysis_run_id:
        raise AlphaMixError(
            "ANALYSIS_NOT_FOUND",
            "The requested analysis run was not found.",
            status_code=404,
            details={"analysis_run_id": request.analysis_run_id},
        )

    normalized = normalize_agent_weights(request.agent_weights, request.enabled_agents)
    mixed_scores = mix_agent_scores(analysis_run.analyses, normalized)
    base = np.array([BASE_EXPECTED_RETURNS[asset_id] for asset_id in ASSET_IDS])
    adjusted = np.array(
        [
            BASE_EXPECTED_RETURNS[asset_id]
            + SCORE_SENSITIVITY[asset_id] * mixed_scores[asset_id]
            for asset_id in ASSET_IDS
        ]
    )

    caps = _merged_caps(request)
    if sum(caps.values()) < 1 - NUMERICAL_TOLERANCE:
        raise AlphaMixError(
            "OPTIMIZATION_INFEASIBLE",
            "Asset caps cannot support a fully invested portfolio.",
            status_code=422,
            details={"max_weight_sum": sum(caps.values())},
        )
    if request.constraints.min_cash > caps["cash"]:
        raise AlphaMixError(
            "OPTIMIZATION_INFEASIBLE",
            "The minimum cash allocation exceeds the cash cap.",
            status_code=422,
            details={"min_cash": request.constraints.min_cash, "cash_cap": caps["cash"]},
        )

    profile = RISK_PROFILES[request.risk_tolerance]
    max_volatility = request.constraints.max_volatility or profile["max_volatility"]
    weights = cp.Variable(len(ASSET_IDS))
    variance = cp.quad_form(weights, COVARIANCE)
    constraints: list[cp.Constraint] = [
        weights >= 0,
        cp.sum(weights) == 1,
        weights[ASSET_IDS.index("cash")] >= request.constraints.min_cash,
        # In the MVP, equity and gold consume the constrained liquidity budget.
        weights[ASSET_IDS.index("us_equity")] + weights[ASSET_IDS.index("gold")]
        <= request.constraints.max_illiquid_weight,
        variance <= float(max_volatility) ** 2,
    ]
    for index, asset_id in enumerate(ASSET_IDS):
        constraints.append(weights[index] <= caps[asset_id])

    objective = cp.Maximize(
        adjusted @ weights - float(profile["risk_aversion"]) * variance
    )
    problem = cp.Problem(objective, constraints)
    solve_errors: list[str] = []
    for solver in (cp.CLARABEL, cp.SCS):
        try:
            problem.solve(solver=solver, verbose=False)
        except cp.error.SolverError as exc:
            solve_errors.append(f"{solver}: {exc}")
            continue
        if problem.status in {cp.OPTIMAL, cp.OPTIMAL_INACCURATE}:
            break

    if problem.status not in {cp.OPTIMAL, cp.OPTIMAL_INACCURATE} or weights.value is None:
        raise AlphaMixError(
            "OPTIMIZATION_INFEASIBLE",
            "No portfolio satisfies the mandatory investment and risk constraints.",
            status_code=422,
            details={"solver_status": problem.status, "solver_errors": solve_errors},
        )

    solved = np.asarray(weights.value, dtype=float).reshape(-1)
    solved[np.abs(solved) < 1e-8] = 0
    if np.any(solved < -NUMERICAL_TOLERANCE):
        raise AlphaMixError(
            "OPTIMIZATION_INFEASIBLE",
            "Solver returned a portfolio outside the long-only constraint.",
            status_code=422,
        )
    solved = np.maximum(solved, 0)
    solved /= solved.sum()

    realized_variance = float(solved @ COVARIANCE @ solved)
    volatility = float(np.sqrt(max(realized_variance, 0)))
    expected_return = float(adjusted @ solved)
    risk_free_rate = BASE_EXPECTED_RETURNS["cash"]
    sharpe = (expected_return - risk_free_rate) / volatility if volatility > 0 else 0.0

    _verify_solution(
        solved,
        caps,
        request.constraints.min_cash,
        request.constraints.max_illiquid_weight,
        float(max_volatility),
    )
    binding = _binding_constraints(
        solved,
        caps,
        request.constraints.min_cash,
        request.constraints.max_illiquid_weight,
        volatility,
        float(max_volatility),
    )
    warnings = list(analysis_run.warnings)
    if normalized.get("risk", 0.0) == 0:
        warnings.append(
            "Risk Agent influence is zero; mandatory portfolio risk constraints remain active."
        )

    return OptimizationResponse(
        optimization_id=str(uuid4()),
        analysis_run_id=analysis_run.analysis_run_id,
        status="optimal" if problem.status == cp.OPTIMAL else "optimal_inaccurate",
        normalized_agent_weights=normalized,
        mixed_scores=mixed_scores,
        base_expected_returns=_as_asset_dict(base),
        adjusted_expected_returns=_as_asset_dict(adjusted),
        portfolio_weights=_as_asset_dict(solved),
        expected_return=expected_return,
        volatility=volatility,
        sharpe_ratio=float(sharpe),
        binding_constraints=binding,
        warnings=warnings,
        model_version=MODEL_VERSION,
        data_as_of=DATA_AS_OF,
    )


def _verify_solution(
    weights: np.ndarray,
    caps: dict[AssetId, float],
    min_cash: float,
    max_illiquid_weight: float,
    max_volatility: float,
) -> None:
    violations: dict[str, float] = {}
    if abs(float(weights.sum()) - 1.0) > NUMERICAL_TOLERANCE:
        violations["weight_sum"] = float(weights.sum())
    for index, asset_id in enumerate(ASSET_IDS):
        if weights[index] > caps[asset_id] + NUMERICAL_TOLERANCE:
            violations[f"{asset_id}_cap"] = float(weights[index])
    cash = float(weights[ASSET_IDS.index("cash")])
    if cash < min_cash - NUMERICAL_TOLERANCE:
        violations["min_cash"] = cash
    illiquid = float(
        weights[ASSET_IDS.index("us_equity")] + weights[ASSET_IDS.index("gold")]
    )
    if illiquid > max_illiquid_weight + NUMERICAL_TOLERANCE:
        violations["max_illiquid_weight"] = illiquid
    volatility = float(np.sqrt(max(float(weights @ COVARIANCE @ weights), 0)))
    if volatility > max_volatility + NUMERICAL_TOLERANCE:
        violations["max_volatility"] = volatility
    if violations:
        raise AlphaMixError(
            "OPTIMIZATION_INFEASIBLE",
            "The solver result failed mandatory post-solve validation.",
            status_code=422,
            details=violations,
        )


def _binding_constraints(
    weights: np.ndarray,
    caps: dict[AssetId, float],
    min_cash: float,
    max_illiquid_weight: float,
    volatility: float,
    max_volatility: float,
) -> list[str]:
    tolerance = 2e-4
    binding = [
        f"max_weight:{asset_id}"
        for index, asset_id in enumerate(ASSET_IDS)
        if abs(float(weights[index]) - caps[asset_id]) <= tolerance
    ]
    cash = float(weights[ASSET_IDS.index("cash")])
    if abs(cash - min_cash) <= tolerance:
        binding.append("min_cash")
    illiquid = float(
        weights[ASSET_IDS.index("us_equity")] + weights[ASSET_IDS.index("gold")]
    )
    if abs(illiquid - max_illiquid_weight) <= tolerance:
        binding.append("max_illiquid_weight")
    if abs(volatility - max_volatility) <= tolerance:
        binding.append("max_volatility")
    return binding

