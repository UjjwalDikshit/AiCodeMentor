"""Output parser stage."""
from __future__ import annotations

import json
import re
from typing import Any, Protocol

from app.core.exceptions import ParseError


class OutputParser(Protocol):
    name: str

    def parse(self, text: str) -> Any: ...


class TextOutputParser:
    name = "text"

    def parse(self, text: str) -> str:
        return (text or "").strip()


class PassthroughOutputParser:
    name = "passthrough"

    def parse(self, text: str) -> str:
        return text or ""


class JsonOutputParser:
    name = "json"

    def parse(self, text: str) -> Any:
        raw = (text or "").strip()
        if not raw:
            raise ParseError("Empty model output — cannot parse JSON")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Tolerate fenced markdown blocks from LLMs
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError as exc:
                    raise ParseError(f"Invalid JSON in fenced block: {exc}") from exc
            raise ParseError("Model output is not valid JSON")


_PARSERS: dict[str, OutputParser] = {
    "text": TextOutputParser(),
    "json": JsonOutputParser(),
    "passthrough": PassthroughOutputParser(),
}


def get_output_parser(fmt: str = "text") -> OutputParser:
    key = (fmt or "text").lower()
    if key not in _PARSERS:
        raise ParseError(f"Unknown output_format '{fmt}'")
    return _PARSERS[key]
