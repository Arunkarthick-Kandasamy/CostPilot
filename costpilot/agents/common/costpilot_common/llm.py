import os
from crewai import LLM
from costpilot_common.config import ANTHROPIC_API_KEY

def get_llm() -> LLM:
    os.environ["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY
    return LLM(
        model="anthropic/claude-sonnet-4-5-20250514",
        temperature=0.3,
        max_tokens=4096,
    )
