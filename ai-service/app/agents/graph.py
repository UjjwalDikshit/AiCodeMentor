"""
LangGraph-style reusable graph infrastructure.
DemoGraph echoes messages — no Interview Agent.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, TypedDict


class GraphState(TypedDict, total=False):
    messages: list[dict[str, str]]
    response: str
    meta: dict[str, Any]


NodeFn = Callable[[GraphState], Awaitable[GraphState] | GraphState]


@dataclass
class Node:
    name: str
    fn: NodeFn


@dataclass
class Edge:
    source: str
    target: str
    condition: Callable[[GraphState], bool] | None = None


@dataclass
class Checkpoint:
    """In-memory checkpoint store (swap for Postgres/Redis later)."""

    store: dict[str, GraphState] = field(default_factory=dict)

    def save(self, thread_id: str, state: GraphState) -> None:
        self.store[thread_id] = dict(state)

    def load(self, thread_id: str) -> GraphState | None:
        return self.store.get(thread_id)


class BaseGraph:
    def __init__(self, name: str = "base") -> None:
        self.name = name
        self.nodes: dict[str, Node] = {}
        self.edges: list[Edge] = []
        self.entry: str | None = None
        self.checkpoint = Checkpoint()

    def add_node(self, name: str, fn: NodeFn) -> None:
        self.nodes[name] = Node(name=name, fn=fn)

    def add_edge(self, source: str, target: str, condition: Callable[[GraphState], bool] | None = None) -> None:
        self.edges.append(Edge(source=source, target=target, condition=condition))

    def set_entry(self, name: str) -> None:
        self.entry = name

    async def _run_node(self, name: str, state: GraphState) -> GraphState:
        node = self.nodes[name]
        result = node.fn(state)
        if hasattr(result, "__await__"):
            result = await result  # type: ignore[misc]
        return result  # type: ignore[return-value]

    def _next(self, current: str, state: GraphState) -> str | None:
        for edge in self.edges:
            if edge.source != current:
                continue
            if edge.condition is None or edge.condition(state):
                return edge.target
        return None

    async def ainvoke(self, state: GraphState, *, thread_id: str | None = None) -> GraphState:
        if not self.entry:
            raise RuntimeError("Graph entry node not set")
        current: str | None = self.entry
        if thread_id:
            restored = self.checkpoint.load(thread_id)
            if restored:
                state = {**restored, **state}
        while current:
            state = await self._run_node(current, state)
            if thread_id:
                self.checkpoint.save(thread_id, state)
            current = self._next(current, state)
        return state


class DemoGraph(BaseGraph):
    """Echoes the last user message — validates graph plumbing only."""

    def __init__(self) -> None:
        super().__init__(name="demo_echo")

        async def ingest(state: GraphState) -> GraphState:
            messages = state.get("messages") or []
            state["meta"] = {"node": "ingest", "count": len(messages)}
            return state

        async def echo(state: GraphState) -> GraphState:
            messages = state.get("messages") or []
            last = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
            state["response"] = f"[DemoGraph] {last}"
            state["meta"] = {**(state.get("meta") or {}), "node": "echo"}
            return state

        self.add_node("ingest", ingest)
        self.add_node("echo", echo)
        self.set_entry("ingest")
        self.add_edge("ingest", "echo")
