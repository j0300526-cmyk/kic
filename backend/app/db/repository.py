import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.config import get_settings
from app.exceptions import AlphaMixError
from app.schemas.scenario import Scenario, ScenarioCreate, ScenarioSummary


class ScenarioRepository:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS scenarios (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )

    def create(self, scenario: ScenarioCreate) -> Scenario:
        stored = Scenario(
            id=str(uuid4()),
            created_at=datetime.now(UTC),
            **scenario.model_dump(),
        )
        payload = stored.model_dump_json()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO scenarios (id, name, created_at, payload) VALUES (?, ?, ?, ?)",
                (stored.id, stored.name, stored.created_at.isoformat(), payload),
            )
        return stored

    def list(self) -> list[ScenarioSummary]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM scenarios ORDER BY created_at DESC"
            ).fetchall()
        return [self._summary(Scenario.model_validate_json(row["payload"])) for row in rows]

    def get(self, scenario_id: str) -> Scenario:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM scenarios WHERE id = ?", (scenario_id,)
            ).fetchone()
        if row is None:
            raise AlphaMixError(
                "SCENARIO_NOT_FOUND",
                "The requested scenario was not found.",
                status_code=404,
                details={"scenario_id": scenario_id},
            )
        return Scenario.model_validate_json(row["payload"])

    def delete(self, scenario_id: str) -> None:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM scenarios WHERE id = ?", (scenario_id,)
            )
        if cursor.rowcount == 0:
            raise AlphaMixError(
                "SCENARIO_NOT_FOUND",
                "The requested scenario was not found.",
                status_code=404,
                details={"scenario_id": scenario_id},
            )

    @staticmethod
    def _summary(scenario: Scenario) -> ScenarioSummary:
        return ScenarioSummary(
            id=scenario.id,
            name=scenario.name,
            created_at=scenario.created_at,
            normalized_agent_weights=scenario.result.normalized_agent_weights,
            expected_return=scenario.result.expected_return,
            volatility=scenario.result.volatility,
        )


def get_scenario_repository() -> ScenarioRepository:
    return ScenarioRepository(get_settings().database_path)

