from fastapi import APIRouter, Depends, Response, status

from app.db.repository import ScenarioRepository, get_scenario_repository
from app.schemas.scenario import Scenario, ScenarioCreate, ScenarioSummary


router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioSummary])
def list_scenarios(
    repository: ScenarioRepository = Depends(get_scenario_repository),
) -> list[ScenarioSummary]:
    return repository.list()


@router.post("", response_model=Scenario, status_code=status.HTTP_201_CREATED)
def create_scenario(
    scenario: ScenarioCreate,
    repository: ScenarioRepository = Depends(get_scenario_repository),
) -> Scenario:
    return repository.create(scenario)


@router.get("/{scenario_id}", response_model=Scenario)
def get_scenario(
    scenario_id: str,
    repository: ScenarioRepository = Depends(get_scenario_repository),
) -> Scenario:
    return repository.get(scenario_id)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: str,
    repository: ScenarioRepository = Depends(get_scenario_repository),
) -> Response:
    repository.delete(scenario_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

