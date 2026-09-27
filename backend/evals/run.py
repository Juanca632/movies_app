"""Run the assistant evals: each case in cases.yaml against the real Claude and TMDB.

From backend/, with the keys in .env:

    python -m evals.run                      # every case
    python -m evals.run --only horror-netflix,off-topic
    python -m evals.run --repeat 3           # each case 3 times, to spot flaky ones
    python -m evals.run --judge              # also have a stronger model score the fit

It costs real money (about 1-2 cents per question, more with --judge). Prints a table,
saves everything (with each tool call) to evals/results/, and exits with 1 when the pass
rate is below --min-score.
"""

import argparse
import asyncio
import json
import os
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from anthropic import AsyncAnthropic

from app.clients.tmdb import TMDBClient
from app.core.config import Settings, get_settings
from app.schemas.assistant import Answer, Failure
from app.services.assistant import PRICES, AssistantError, AssistantService
from app.services.discover import DiscoverService
from evals.checks import Case, Trace, check, load_cases
from evals.judge import PASS_SCORE, judge

HERE = Path(__file__).parent


class _Recorder:
    """Stands in for the Anthropic client: forwards every call and notes what happened."""

    def __init__(self, claude: AsyncAnthropic, trace: Trace) -> None:
        self._claude = claude
        self._trace = trace
        self.messages = self

    async def create(self, **kwargs: Any) -> Any:
        response = await self._claude.messages.create(**kwargs)
        self._trace.turns += 1
        self._trace.tokens_in += response.usage.input_tokens
        self._trace.tokens_out += response.usage.output_tokens
        for block in response.content:
            if block.type == "tool_use":
                self._trace.tool_calls.append((block.name, dict(block.input)))
        return response


@dataclass
class Result:
    case: str
    run: int
    question: str
    passed: bool
    failures: list[str]
    picks: list[str]
    intro: str
    trace: Trace
    judge_score: int | None = None
    judge_reason: str | None = None


async def _run_case(
    case: Case,
    number: int,
    claude: AsyncAnthropic,
    tmdb: TMDBClient,
    settings: Settings,
    genres: dict[int, str],
    use_judge: bool,
) -> Result:
    trace = Trace()
    # A fresh service per run: its own recorder, and no answers cached from earlier runs.
    service = AssistantService(_Recorder(claude, trace), tmdb, settings)  # type: ignore[arg-type]
    answer: Answer | None = None
    error: str | None = None
    started = time.perf_counter()
    try:
        async for event in service.ask(case.question, case.region, case.history):
            if isinstance(event, Answer):
                answer = event
            elif isinstance(event, Failure):
                error = event.message
    except AssistantError as exc:
        error = str(exc)
    except Exception as exc:  # an eval run reports failures, it doesn't stop on them
        error = f"{type(exc).__name__}: {exc}"
    trace.seconds = time.perf_counter() - started
    price_in, price_out = PRICES.get(settings.assistant_model, (0.0, 0.0))
    trace.cost = trace.tokens_in / 1e6 * price_in + trace.tokens_out / 1e6 * price_out

    failures = check(case.expect, answer, error, trace, genres)
    result = Result(
        case=case.id,
        run=number,
        question=case.question,
        passed=not failures,
        failures=failures,
        picks=[pick.item.title for pick in answer.picks] if answer else [],
        intro=answer.intro if answer else "",
        trace=trace,
    )
    if use_judge and answer is not None:
        try:
            verdict, cost = await judge(claude, case, answer)
        except Exception as exc:
            result.failures.append(f"judge failed: {type(exc).__name__}: {exc}")
        else:
            result.judge_score, result.judge_reason = verdict.score, verdict.reason
            trace.cost += cost
            if verdict.score < PASS_SCORE:
                result.failures.append(f"judge: {verdict.score}/5, {verdict.reason}")
        result.passed = not result.failures
    return result


def _print(result: Result) -> None:
    mark = "✅" if result.passed else "❌"
    label = result.case if result.run == 1 else f"{result.case} #{result.run}"
    score = f"  judge {result.judge_score}/5" if result.judge_score else ""
    print(
        f"{mark} {label:<24} {result.question[:44]:<44} "
        f"{result.trace.seconds:5.1f}s ${result.trace.cost:.4f}{score}",
        flush=True,
    )
    for failure in result.failures:
        print(f"      → {failure}")


def _summary(results: list[Result]) -> dict[str, Any]:
    passed = sum(r.passed for r in results)
    scores = [r.judge_score for r in results if r.judge_score]
    return {
        "passed": passed,
        "total": len(results),
        "score": passed / len(results) if results else 0.0,
        "cost": sum(r.trace.cost for r in results),
        "slowest_seconds": max((r.trace.seconds for r in results), default=0.0),
        "judge_average": sum(scores) / len(scores) if scores else None,
    }


def _markdown(results: list[Result], summary: dict[str, Any], model: str) -> str:
    """The report for the GitHub Actions job summary."""
    lines = [
        f"## Assistant evals: {summary['passed']}/{summary['total']} ({summary['score']:.0%})",
        f"Model `{model}` · cost ${summary['cost']:.2f}",
        "",
        "| | Case | Question | Picks | Problems |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        cell = "<br>".join(r.failures).replace("|", "\\|")
        picks = ", ".join(r.picks).replace("|", "\\|")
        lines.append(
            f"| {'✅' if r.passed else '❌'} | {r.case} | {r.question} | {picks} | {cell} |"
        )
    return "\n".join(lines) + "\n"


async def main(args: argparse.Namespace) -> int:
    settings = get_settings()
    if not settings.anthropic_api_key:
        print("ANTHROPIC_API_KEY is not set (backend/.env): the evals need the real Claude.")
        return 2
    cases = load_cases(args.cases)
    if args.only:
        wanted = set(args.only.split(","))
        unknown = wanted - {case.id for case in cases}
        if unknown:
            print(f"Unknown case ids: {', '.join(sorted(unknown))}")
            return 2
        cases = [case for case in cases if case.id in wanted]

    claude = AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=60.0, max_retries=3)
    tmdb = TMDBClient(settings)
    try:
        discover = DiscoverService(tmdb, settings)
        genres = {
            genre.id: genre.name
            for media_type in ("movie", "tv")
            for genre in await discover.genres(media_type)
        }
        runs = [(case, n) for case in cases for n in range(1, args.repeat + 1)]
        print(
            f"Running {len(runs)} questions with {settings.assistant_model}"
            f"{' + judge' if args.judge else ''}...\n"
        )
        limit = asyncio.Semaphore(args.concurrency)

        async def one(case: Case, number: int) -> Result:
            async with limit:
                result = await _run_case(case, number, claude, tmdb, settings, genres, args.judge)
            _print(result)
            return result

        results = await asyncio.gather(*(one(case, n) for case, n in runs))
    finally:
        await tmdb.aclose()
        await claude.close()

    summary = _summary(results)
    print(
        f"\nPassed {summary['passed']}/{summary['total']} ({summary['score']:.0%}) · "
        f"cost ${summary['cost']:.2f}"
        + (f" · judge {summary['judge_average']:.1f}/5" if summary["judge_average"] else "")
    )

    out = HERE / "results"
    out.mkdir(exist_ok=True)
    path = out / f"{datetime.now():%Y%m%d-%H%M%S}.json"
    report = {
        "model": settings.assistant_model,
        "summary": summary,
        "results": [asdict(result) for result in results],
    }
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Details: {path.relative_to(HERE.parent)}")

    if step_summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(step_summary, "a", encoding="utf-8") as file:
            file.write(_markdown(results, summary, settings.assistant_model))

    if summary["score"] < args.min_score:
        print(f"Below the minimum pass rate of {args.min_score:.0%}.")
        return 1
    return 0


def _parse(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the AI assistant evals.")
    parser.add_argument("--only", help="comma-separated case ids")
    parser.add_argument("--repeat", type=int, default=1, help="runs per case")
    parser.add_argument("--judge", action="store_true", help="also score with an LLM judge")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--min-score", type=float, default=0.8, help="pass rate, 0-1")
    parser.add_argument("--cases", default=str(HERE / "cases.yaml"))
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(asyncio.run(main(_parse(sys.argv[1:]))))
