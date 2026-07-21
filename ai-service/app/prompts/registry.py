"""Prompt registry — load / version / validate prompts from YAML files."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from app.core.exceptions import PromptError


class PromptRegistry:
    def __init__(self, directory: str) -> None:
        self.directory = Path(directory)
        self._cache: dict[str, dict[str, Any]] = {}

    def _path_for(self, name: str) -> Path:
        path = self.directory / f"{name}.yaml"
        if not path.exists():
            path = self.directory / f"{name}.yml"
        return path

    def load(self, name: str, *, refresh: bool = False) -> dict[str, Any]:
        if name in self._cache and not refresh:
            return self._cache[name]
        path = self._path_for(name)
        if not path.exists():
            raise PromptError(f"Prompt '{name}' not found in {self.directory}")
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except Exception as exc:  # noqa: BLE001
            raise PromptError(f"Failed to parse prompt '{name}': {exc}") from exc
        self.validate(data, name=name)
        self._cache[name] = data
        return data

    def validate(self, data: dict[str, Any], *, name: str = "") -> None:
        if not isinstance(data, dict):
            raise PromptError(f"Prompt {name} must be a mapping")
        if "template" not in data:
            raise PromptError(f"Prompt {name} missing 'template'")
        if "version" not in data:
            raise PromptError(f"Prompt {name} missing 'version'")

    def render(self, name: str, variables: dict[str, Any] | None = None) -> str:
        prompt = self.load(name)
        template = str(prompt["template"])
        variables = variables or {}
        required = prompt.get("variables") or []
        missing = [v for v in required if v not in variables]
        if missing:
            raise PromptError(f"Prompt '{name}' missing variables: {', '.join(missing)}")

        def replacer(match: re.Match[str]) -> str:
            key = match.group(1)
            if key not in variables:
                raise PromptError(f"Unresolved variable '{{{{{key}}}}}' in prompt '{name}'")
            return str(variables[key])

        return re.sub(r"\{\{\s*(\w+)\s*\}\}", replacer, template)

    def list_prompts(self) -> list[dict[str, Any]]:
        if not self.directory.exists():
            return []
        items = []
        for path in sorted(self.directory.glob("*.y*ml")):
            data = self.load(path.stem)
            items.append(
                {
                    "name": path.stem,
                    "role": data.get("role"),
                    "version": data.get("version"),
                    "description": data.get("description", ""),
                }
            )
        return items

    def get_version(self, name: str) -> str:
        return str(self.load(name).get("version"))
