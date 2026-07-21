"""Reusable conversation memory strategies (infrastructure)."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Message:
    role: str
    content: str


class BaseMemory:
    def add(self, role: str, content: str) -> None:
        raise NotImplementedError

    def get(self) -> list[dict[str, str]]:
        raise NotImplementedError

    def clear(self) -> None:
        raise NotImplementedError


class BufferMemory(BaseMemory):
    """Store all messages."""

    def __init__(self) -> None:
        self._messages: list[Message] = []

    def add(self, role: str, content: str) -> None:
        self._messages.append(Message(role=role, content=content))

    def get(self) -> list[dict[str, str]]:
        return [{"role": m.role, "content": m.content} for m in self._messages]

    def clear(self) -> None:
        self._messages.clear()


class WindowMemory(BaseMemory):
    """Keep last N messages."""

    def __init__(self, window_size: int = 10) -> None:
        self._messages: deque[Message] = deque(maxlen=window_size)

    def add(self, role: str, content: str) -> None:
        self._messages.append(Message(role=role, content=content))

    def get(self) -> list[dict[str, str]]:
        return [{"role": m.role, "content": m.content} for m in self._messages]

    def clear(self) -> None:
        self._messages.clear()


class SummaryMemory(BaseMemory):
    """Keeps a running summary string + recent tail."""

    def __init__(self, window_size: int = 4) -> None:
        self.summary: str = ""
        self._tail = WindowMemory(window_size=window_size)

    def add(self, role: str, content: str) -> None:
        self._tail.add(role, content)
        # Lightweight summary update (no LLM) — infrastructure placeholder
        self.summary = (self.summary + f" {role}: {content}").strip()[-500:]

    def get(self) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        if self.summary:
            messages.append({"role": "system", "content": f"Conversation summary: {self.summary}"})
        messages.extend(self._tail.get())
        return messages

    def clear(self) -> None:
        self.summary = ""
        self._tail.clear()


class ConversationMemory(BufferMemory):
    """Alias for full conversation buffer."""


@dataclass
class MemoryFactory:
    """Create memory instances by strategy name."""

    def create(self, kind: str = "buffer", **kwargs: Any) -> BaseMemory:
        key = kind.lower()
        if key in {"buffer", "conversation"}:
            return ConversationMemory()
        if key == "window":
            return WindowMemory(window_size=int(kwargs.get("window_size", 10)))
        if key == "summary":
            return SummaryMemory(window_size=int(kwargs.get("window_size", 4)))
        raise ValueError(f"Unknown memory kind: {kind}")
