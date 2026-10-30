"""Stable errors raised by the analysis workflow."""


class AgentError(RuntimeError):
    """Base class for agent workflow failures."""


class ModelNotConfiguredError(AgentError):
    """Raised when explicit LLM mode is requested without model settings."""

    code = "MODEL_NOT_CONFIGURED"


class AgentOutputError(AgentError):
    """Raised when an LLM response cannot satisfy the output contract."""

    code = "INVALID_AGENT_OUTPUT"

