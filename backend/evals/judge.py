"""Optional LLM judge (`--judge`): scores what the rules can't, like whether the picks and
reasons actually fit the request. A stronger model than the assistant's, so it can tell.
"""

from typing import Annotated

from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field

from app.schemas.assistant import Answer
from evals.checks import Case

JUDGE_MODEL = "claude-opus-5"
JUDGE_PRICES = (5.0, 25.0)  # USD per million tokens (input, output)
PASS_SCORE = 3

RUBRIC = """You grade the answers of a movie and TV recommendation assistant. Given what the \
user asked and what the assistant answered, score the answer from 1 to 5:

5: every pick clearly fits the request, the reasons are specific and true, no spoilers.
4: good picks, maybe one weaker fit or a generic reason.
3: acceptable, but several picks fit only loosely.
2: most picks miss what was asked (wrong mood, audience, type or constraints).
1: useless, off-topic or wrong.

If the request was not about choosing something to watch, a short polite refusal with no \
picks deserves a 5. Judge only the fit; the titles are real, taken from TMDB. \
Explain the score in one sentence, in English."""


class Verdict(BaseModel):
    score: Annotated[int, Field(ge=1, le=5)]
    reason: str


def _describe(case: Case, answer: Answer) -> str:
    lines = [f"User's country: {case.region}"]
    for turn in case.history:
        titles = ", ".join(pick.title for pick in turn.picks)
        lines.append(f"Earlier, the user asked: {turn.question} (recommended: {titles})")
    lines += [f"Request: {case.question}", "", f"Answer intro: {answer.intro}"]
    for pick in answer.picks:
        item = pick.item
        on = ", ".join(p.provider_name for p in pick.providers) or "not streaming"
        lines.append(
            f"- {item.title} ({item.media_type}, {(item.release_date or '?')[:4]}, "
            f"rated {item.vote_average:.1f}; {on}): {pick.reason}"
        )
    return "\n".join(lines)


async def judge(claude: AsyncAnthropic, case: Case, answer: Answer) -> tuple[Verdict, float]:
    """The verdict and what it cost (USD)."""
    response = await claude.messages.parse(
        model=JUDGE_MODEL,
        max_tokens=4000,
        system=RUBRIC,
        messages=[{"role": "user", "content": _describe(case, answer)}],
        output_format=Verdict,
    )
    price_in, price_out = JUDGE_PRICES
    usage = response.usage
    cost = usage.input_tokens / 1e6 * price_in + usage.output_tokens / 1e6 * price_out
    return response.parsed_output, cost
