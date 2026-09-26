import json
from types import SimpleNamespace

import anthropic
import httpx
import pytest
import respx

from app.core.ratelimit import RateLimiter

BASE = "https://tmdb.test/3"

MOVIE_ITEM = {
    "id": 1,
    "title": "Movie One",
    "release_date": "2024-01-01",
    "vote_average": 7.5,
    "genre_ids": [35],
}
NETFLIX = {"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.png"}


# A stand-in for Claude: it answers with the scripted replies, in order, and records each request.
class FakeClaude:
    def __init__(self) -> None:
        self.replies: list = []
        self.requests: list[dict] = []
        self.messages = self

    async def create(self, **request):
        self.requests.append({**request, "messages": list(request["messages"])})
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def tool_use(name: str, args: dict, call_id: str = "") -> SimpleNamespace:
    return SimpleNamespace(type="tool_use", id=call_id or f"call_{name}", name=name, input=args)


def text(value: str) -> SimpleNamespace:
    return SimpleNamespace(type="text", text=value)


def reply(*content, stop_reason: str = "tool_use") -> SimpleNamespace:
    usage = SimpleNamespace(input_tokens=100, output_tokens=20)
    return SimpleNamespace(content=list(content), stop_reason=stop_reason, usage=usage)


DISCOVER_COMEDIES = tool_use(
    "discover",
    {"media_type": "movie", "genre_ids": [35], "service_ids": [8], "max_runtime": 100},
)
PRESENT_MOVIE_ONE = tool_use(
    "present_picks",
    {"intro": "Two laughs.", "picks": [{"media_type": "movie", "id": 1, "reason": "Short."}]},
)


def events(response: httpx.Response) -> list[dict]:
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]


@pytest.fixture
def settings(settings):
    settings.assistant_hourly_limit = 2
    return settings


@pytest.fixture
def claude() -> FakeClaude:
    return FakeClaude()


@pytest.fixture
async def ask_api(settings, tmdb, claude):
    from app.api.deps import get_assistant, get_tmdb
    from app.core.config import get_settings
    from app.main import create_app
    from app.services.assistant import AssistantService

    assistant = AssistantService(claude, tmdb, settings)
    app = create_app()
    app.dependency_overrides[get_tmdb] = lambda: tmdb
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_assistant] = lambda: assistant
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://api.test") as client:
        yield client


@pytest.fixture
def tmdb_routes():
    with respx.mock:
        respx.get(f"{BASE}/genre/movie/list").respond(
            json={"genres": [{"id": 35, "name": "Comedy"}]}
        )
        respx.get(f"{BASE}/genre/tv/list").respond(json={"genres": [{"id": 18, "name": "Drama"}]})
        respx.get(f"{BASE}/watch/providers/movie").respond(json={"results": [NETFLIX]})
        routes = SimpleNamespace(
            discover=respx.get(f"{BASE}/discover/movie").respond(
                json={"page": 1, "total_pages": 1, "results": [MOVIE_ITEM]}
            ),
            where=respx.get(f"{BASE}/movie/1/watch/providers").respond(
                json={"results": {"ES": {"flatrate": [NETFLIX]}}}
            ),
        )
        yield routes


async def test_recommends_titles_found_with_the_tools(ask_api, claude, tmdb_routes):
    claude.replies = [reply(DISCOVER_COMEDIES), reply(PRESENT_MOVIE_ONE)]

    response = await ask_api.post("/api/v1/ask", json={"question": "short comedy", "region": "ES"})

    assert response.headers["content-type"].startswith("text/event-stream")
    status, answer = events(response)
    assert status == {"type": "status", "text": "Searching comedy movies on Netflix"}
    assert answer["intro"] == "Two laughs."
    [pick] = answer["picks"]
    assert (pick["item"]["title"], pick["reason"]) == ("Movie One", "Short.")
    assert [p["provider_name"] for p in pick["providers"]] == ["Netflix"]

    params = tmdb_routes.discover.calls.last.request.url.params
    assert params["with_genres"] == "35"
    assert params["with_watch_providers"] == "8"
    assert params["watch_region"] == "ES"
    assert params["with_runtime.lte"] == "100"
    # The ids Claude needs are already in the prompt, so it doesn't spend turns looking them up.
    assert "35 Comedy" in claude.requests[0]["system"]
    assert "8 Netflix" in claude.requests[0]["system"]


async def test_titles_no_tool_returned_are_sent_back_as_an_error(ask_api, claude, tmdb_routes):
    invented = tool_use(
        "present_picks",
        {"intro": "Hi.", "picks": [{"media_type": "movie", "id": 999, "reason": "Made up."}]},
    )
    claude.replies = [reply(DISCOVER_COMEDIES), reply(invented), reply(PRESENT_MOVIE_ONE)]

    response = await ask_api.post("/api/v1/ask", json={"question": "comedy", "region": "ES"})

    assert [pick["item"]["id"] for pick in events(response)[-1]["picks"]] == [1]
    [result] = claude.requests[2]["messages"][-1]["content"]
    assert result["is_error"] is True
    assert "999" in result["content"]


async def test_picks_written_as_text_are_asked_for_again_through_the_tool(
    ask_api, claude, tmdb_routes
):
    claude.replies = [
        reply(DISCOVER_COMEDIES),
        reply(text("1. Movie One"), stop_reason="end_turn"),
        reply(PRESENT_MOVIE_ONE),
    ]

    response = await ask_api.post("/api/v1/ask", json={"question": "comedy", "region": "ES"})

    assert events(response)[-1]["picks"][0]["item"]["title"] == "Movie One"
    assert claude.requests[1]["tool_choice"] == {"type": "auto"}
    assert claude.requests[2]["tool_choice"] == {"type": "tool", "name": "present_picks"}


async def test_off_topic_questions_get_a_plain_answer(ask_api, claude, tmdb_routes):
    claude.replies = [
        reply(text("I can only help you pick something to watch."), stop_reason="end_turn")
    ]

    response = await ask_api.post("/api/v1/ask", json={"question": "capital of France?"})

    assert events(response) == [
        {"type": "answer", "intro": "I can only help you pick something to watch.", "picks": []}
    ]


async def test_the_same_question_is_answered_from_the_cache(ask_api, claude, tmdb_routes):
    claude.replies = [reply(DISCOVER_COMEDIES), reply(PRESENT_MOVIE_ONE)]
    first = await ask_api.post("/api/v1/ask", json={"question": "Short comedy", "region": "ES"})

    again = await ask_api.post(
        "/api/v1/ask", json={"question": "  short   COMEDY ", "region": "ES"}
    )

    assert len(claude.requests) == 2
    assert events(again) == events(first)[-1:]


async def test_each_visitor_has_a_question_limit(ask_api, claude, tmdb_routes):
    claude.replies = [reply(text("Sure."), stop_reason="end_turn") for _ in range(3)]
    visitor = {"X-Real-IP": "203.0.113.7"}

    for question in ("one", "two"):
        response = await ask_api.post("/api/v1/ask", json={"question": question}, headers=visitor)
        assert response.status_code == 200
    blocked = await ask_api.post("/api/v1/ask", json={"question": "three"}, headers=visitor)
    other = await ask_api.post(
        "/api/v1/ask", json={"question": "three"}, headers={"X-Real-IP": "2"}
    )

    assert blocked.status_code == 429
    assert other.status_code == 200


async def test_failures_are_reported_as_an_error_event(ask_api, claude, tmdb_routes):
    claude.replies = [anthropic.APIConnectionError(request=None)]

    response = await ask_api.post("/api/v1/ask", json={"question": "comedy"})

    assert response.status_code == 200
    assert events(response) == [
        {
            "type": "error",
            "message": "The assistant is not available right now. Try again later.",
        }
    ]


async def test_answers_that_run_out_of_tokens_are_an_error(ask_api, claude, tmdb_routes):
    claude.replies = [reply(text("1. A very long"), stop_reason="max_tokens")]

    response = await ask_api.post("/api/v1/ask", json={"question": "comedy"})

    assert events(response)[0]["type"] == "error"


async def test_the_assistant_is_unavailable_without_an_api_key(api):
    response = await api.post("/api/v1/ask", json={"question": "comedy"})

    assert response.status_code == 503


async def test_questions_must_have_a_sensible_length(ask_api):
    assert (await ask_api.post("/api/v1/ask", json={"question": "hi"})).status_code == 422
    assert (await ask_api.post("/api/v1/ask", json={"question": "x" * 301})).status_code == 422


def test_rate_limiter_forgets_hits_older_than_its_window():
    now = [0.0]
    limiter = RateLimiter(limit=2, window=60, timer=lambda: now[0])

    assert limiter.hit("a") and limiter.hit("a")
    assert not limiter.hit("a")
    assert limiter.hit("b")
    now[0] = 61
    assert limiter.hit("a")


FOLLOW_UP = {
    "question": "more recent ones",
    "region": "ES",
    "history": [
        {
            "question": "short comedy",
            "picks": [{"media_type": "movie", "id": 5, "title": "Old Laughs"}],
        }
    ],
}


async def test_follow_ups_get_a_recap_of_the_conversation(ask_api, claude, tmdb_routes):
    claude.replies = [reply(DISCOVER_COMEDIES), reply(PRESENT_MOVIE_ONE)]

    response = await ask_api.post("/api/v1/ask", json=FOLLOW_UP)

    assert events(response)[-1]["picks"][0]["item"]["title"] == "Movie One"
    # The model has no memory: the earlier question and its picks travel with the new one.
    first_message = claude.requests[0]["messages"][0]["content"]
    assert "The user asked: short comedy" in first_message
    assert "You recommended: Old Laughs (movie 5)" in first_message
    assert first_message.endswith("New request: more recent ones")


async def test_follow_ups_are_never_answered_from_the_cache(ask_api, claude, tmdb_routes):
    claude.replies = [reply(DISCOVER_COMEDIES), reply(PRESENT_MOVIE_ONE)] * 2

    await ask_api.post("/api/v1/ask", json=FOLLOW_UP)
    await ask_api.post("/api/v1/ask", json=FOLLOW_UP)

    assert len(claude.requests) == 4


async def test_the_recap_is_limited_to_the_last_few_turns(ask_api):
    history = [{"question": f"question {n}", "picks": []} for n in range(6)]

    response = await ask_api.post("/api/v1/ask", json={"question": "and now?", "history": history})

    assert response.status_code == 422
