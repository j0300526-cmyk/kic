from pathlib import Path

from app.db.repository import ScenarioRepository
from app.schemas.common import AGENT_IDS
from app.schemas.portfolio import OptimizationRequest, PortfolioConstraints
from app.schemas.scenario import ScenarioCreate
from app.services.optimizer import optimize_portfolio


def test_scenario_survives_repository_recreation(tmp_path: Path, analysis_run) -> None:
    database = tmp_path / "scenarios.db"
    request = OptimizationRequest(
        analysis_run_id=analysis_run.analysis_run_id,
        agent_weights=dict.fromkeys(AGENT_IDS, 20),
        enabled_agents=list(AGENT_IDS),
        risk_tolerance="balanced",
        constraints=PortfolioConstraints(),
    )
    result = optimize_portfolio(request, analysis_run)
    created = ScenarioRepository(database).create(
        ScenarioCreate(name="Committee baseline", request=request, result=result)
    )

    reopened = ScenarioRepository(database)
    loaded = reopened.get(created.id)
    assert loaded.name == "Committee baseline"
    assert loaded.result.portfolio_weights == created.result.portfolio_weights
    assert reopened.list()[0].id == created.id

    reopened.delete(created.id)
    assert reopened.list() == []

