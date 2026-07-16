"""
LangGraph / multi-agent orchestration placeholders.
Each agent should expose a clear interface; compose in graphs later.
"""


class BaseAgent:
    """Interface for coach agents (DIP)."""

    name: str = "base"

    async def run(self, *_args, **_kwargs) -> dict:
        return {"success": True, "message": "Coming Soon", "agent": self.name}


class CoachAgent(BaseAgent):
    name = "coach"


class InterviewAgent(BaseAgent):
    name = "interview"


class ResumeAgent(BaseAgent):
    name = "resume"


class CodeReviewAgent(BaseAgent):
    name = "code_review"
