"""Playground: a minimal tool-calling agent over our own TMDB services.

The real assistant (with more tools, limits and streaming) is app/services/assistant.py;
this is the bare loop, kept small to experiment with.

Run from backend/:  python -m scripts.agent_playground "something funny and short on Netflix"

It prints every step of the loop so you can see what the model asks for,
what our code runs, and what it costs.
"""

import asyncio
import json
import sys
from typing import Any

import anthropic

from app.clients.tmdb import TMDBClient
from app.core.config import get_settings
from app.services.discover import DiscoverService

MODEL = "claude-haiku-4-5"
REGION = "ES"
MAX_TURNS = 6

# Haiku 4.5 pricing, USD per million tokens.
PRICE_IN, PRICE_OUT = 1.00, 5.00

SYSTEM = f"""You help people pick something to watch. The user is in region {REGION}.
Use the tools to find real titles; never recommend a title the tools did not return.
Look up genre and streaming service IDs before filtering by them.
Answer with 3 to 5 picks, each with one sentence on why it fits the request."""

# 1. The "manual" we give the model: name, what it does, and its parameters (JSON Schema).
TOOLS = [
    {
        "name": "list_genres",
        "description": "List the genres (id and name) for movies or TV shows.",
        "input_schema": {
            "type": "object",
            "properties": {"media_type": {"type": "string", "enum": ["movie", "tv"]}},
            "required": ["media_type"],
        },
    },
    {
        "name": "list_streaming_services",
        "description": f"List the streaming services (id and name) available in {REGION}.",
        "input_schema": {
            "type": "object",
            "properties": {"media_type": {"type": "string", "enum": ["movie", "tv"]}},
            "required": ["media_type"],
        },
    },
    {
        "name": "discover",
        "description": (
            "Find movies or TV shows, optionally filtered by one genre id and one "
            "streaming service id. Returns up to 10 titles with year, rating and synopsis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "media_type": {"type": "string", "enum": ["movie", "tv"]},
                "genre_id": {"type": "integer"},
                "provider_id": {"type": "integer"},
                "sort": {"type": "string", "enum": ["popular", "top_rated", "newest"]},
            },
            "required": ["media_type"],
        },
    },
]


# 2. What actually runs when the model asks for a tool: our existing services.
async def run_tool(discover: DiscoverService, name: str, args: dict[str, Any]) -> Any:
    if name == "list_genres":
        return [g.model_dump() for g in await discover.genres(args["media_type"])]
    if name == "list_streaming_services":
        providers = await discover.providers(args["media_type"], REGION)
        return [{"id": p.provider_id, "name": p.provider_name} for p in providers[:25]]
    if name == "discover":
        page = await discover.discover(
            args["media_type"],
            sort=args.get("sort", "popular"),
            page=1,
            genres=[args["genre_id"]] if args.get("genre_id") else [],
            providers=[args["provider_id"]] if args.get("provider_id") else [],
            region=REGION,
        )
        return [
            {
                "id": m.id,
                "title": m.title,
                "year": (m.release_date or "")[:4],
                "rating": m.vote_average,
                "overview": m.overview[:200],
            }
            for m in page.results[:10]
        ]
    raise ValueError(f"Unknown tool: {name}")


async def main(question: str) -> None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        sys.exit("ANTHROPIC_API_KEY is not set in backend/.env")

    claude = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    tmdb = TMDBClient(settings)
    discover = DiscoverService(tmdb, settings)

    messages: list[dict[str, Any]] = [{"role": "user", "content": question}]
    tokens_in = tokens_out = 0

    try:
        # 3. The agent loop: ask the model, run the tools it requests, send results back.
        for turn in range(1, MAX_TURNS + 1):
            response = await claude.messages.create(
                model=MODEL, max_tokens=2048, system=SYSTEM, tools=TOOLS, messages=messages
            )
            tokens_in += response.usage.input_tokens
            tokens_out += response.usage.output_tokens
            print(f"\n── turn {turn} · stop_reason={response.stop_reason}")

            if response.stop_reason != "tool_use":
                text = "".join(b.text for b in response.content if b.type == "text")
                print(f"\n{text}")
                break

            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in response.content:
                if block.type == "text" and block.text.strip():
                    print(f"   model says: {block.text.strip()}")
                if block.type != "tool_use":
                    continue
                print(f"   model asks: {block.name}({json.dumps(block.input)})")
                try:
                    output = await run_tool(discover, block.name, block.input)
                    results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(output),
                        }
                    )
                    print(f"   we return:  {len(output)} items")
                except Exception as error:  # tell the model, so it can recover
                    results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"Error: {error}",
                            "is_error": True,
                        }
                    )
                    print(f"   error:      {error}")
            messages.append({"role": "user", "content": results})
        else:
            print("\nStopped: too many turns.")
    finally:
        await tmdb.aclose()
        await claude.close()

    cost = tokens_in / 1e6 * PRICE_IN + tokens_out / 1e6 * PRICE_OUT
    print(f"\ntokens: {tokens_in} in / {tokens_out} out · cost ≈ ${cost:.4f}")


if __name__ == "__main__":
    asyncio.run(main(" ".join(sys.argv[1:]) or "Something funny and short to watch on Netflix"))
