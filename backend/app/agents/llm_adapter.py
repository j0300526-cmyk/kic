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
            raise ModelNotConfiguredError(f"LLM 모드에 필요한 설정이 없습니다: {', '.join(missing)}")
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
                        {"role": "system", "content": "근거 기반 기관 포트폴리오 분석을 엄격한 JSON 형식과 한국어 설명으로 반환하세요."},
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
            raise AgentOutputError(f"모델 요청 또는 출력 처리에 실패했습니다: {exc}") from exc


def _decode_json_object(content: Any) -> dict[str, Any]:
    if not isinstance(content, str):
        raise AgentOutputError("모델 응답 본문은 JSON 문자열이어야 합니다")
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1])
    value = json.loads(text)
    if not isinstance(value, dict):
        raise AgentOutputError("모델 출력은 JSON 객체여야 합니다")
    return value


def _build_prompt(agent_id: str, agent_name: str) -> str:
    return (
        f"{agent_name} ({agent_id}) 역할로 다음 자산만 분석하세요: {', '.join(ASSET_IDS)}. "
        "모든 자산의 점수(-1..1), 출처(title, publisher, url, as_of), 분석 근거, "
        "신뢰도(0..1), 불확실성, ISO-8601 형식의 as_of를 반환하세요. "
        "설명 값은 한국어로 작성하고, 마크다운이나 출처 없는 주장은 반환하지 마세요."
    )

