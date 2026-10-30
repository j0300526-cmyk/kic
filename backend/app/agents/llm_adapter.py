"""Environment-driven OpenAI-compatible model adapter."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Protocol

import httpx
from pydantic import ValidationError

from app.schemas.agent import AgentAnalysis
from app.schemas.common import ASSET_IDS

from .catalog import MOCK_AS_OF
from .exceptions import AgentOutputError, ModelNotConfiguredError


class AnalysisAdapter(Protocol):
    def analyze(self, agent_id: str, agent_name: str) -> AgentAnalysis: ...


@dataclass(frozen=True)
class LLMConfig:
    api_url: str
    api_key: str
    model: str
    timeout_seconds: float = 30.0

    @classmethod
    def from_env(cls) -> "LLMConfig":
        api_url = os.getenv("ALPHAMIX_LLM_API_URL", "").strip()
        api_key = os.getenv("ALPHAMIX_LLM_API_KEY", "").strip()
        model = os.getenv("ALPHAMIX_LLM_MODEL", "").strip()
        missing = []
        if not api_url:
            missing.append("ALPHAMIX_LLM_API_URL")
        if not api_key:
            missing.append("ALPHAMIX_LLM_API_KEY")
        if not model:
            missing.append("ALPHAMIX_LLM_MODEL")
        if missing:
            raise ModelNotConfiguredError(f"LLM mode requires: {', '.join(missing)}")
        return cls(api_url=api_url, api_key=api_key, model=model)


class OpenAICompatibleAdapter:
    """Small adapter for chat-completions compatible model endpoints."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig.from_env()

    def analyze(self, agent_id: str, agent_name: str) -> AgentAnalysis:
        try:
            response = httpx.post(
                self.config.api_url,
                headers={"Authorization": f"Bearer {self.config.api_key}"},
                json={
                    "model": self.config.model,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "Return evidence-based institutional portfolio analysis as strict JSON."},
                        {"role": "user", "content": _build_prompt(agent_id, agent_name)},
                    ],
                },
                timeout=self.config.timeout_seconds,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            raw = _decode_json_object(content)
            raw.update({"agent_id": agent_id, "agent_name": agent_name, "mode": "llm", "assets": list(ASSET_IDS)})
            raw.setdefault("as_of", MOCK_AS_OF.isoformat())
            return AgentAnalysis.model_validate(raw)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as exc:
            raise AgentOutputError(f"Model request or output failed: {exc}") from exc


def _decode_json_object(content: Any) -> dict[str, Any]:
    if not isinstance(content, str):
        raise AgentOutputError("Model content must be a JSON string")
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1])
    value = json.loads(text)
    if not isinstance(value, dict):
        raise AgentOutputError("Model output must be a JSON object")
    return value


def _build_prompt(agent_id: str, agent_name: str) -> str:
    return (
        f"Act as {agent_name} ({agent_id}). Analyze exactly: {', '.join(ASSET_IDS)}. "
        "Return scores (-1..1 for every asset), sources (title, publisher, url, as_of), "
        "rationale, confidence (0..1), uncertainties, and an ISO-8601 as_of. "
        "Do not return markdown or unsourced claims."
    )

