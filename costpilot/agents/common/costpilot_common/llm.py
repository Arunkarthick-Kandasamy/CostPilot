from crewai import LLM
from costpilot_common.config import ANTHROPIC_API_KEY

def get_llm() -> LLM:
    return LLM(
        model="claude-sonnet-4-5-20250514",
        api_key=ANTHROPIC_API_KEY,
        temperature=0.3,
        max_tokens=4096,
    )
