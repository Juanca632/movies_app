"""The eval rules themselves (evals/checks.py). No Claude, no network: they run in CI."""

from datetime import date
from pathlib import Path

import pytest

from app.schemas.assistant import Answer, Pick
from app.schemas.media import MediaSummary, Provider
from evals.checks import Expect, Trace, check, guess_language, load_cases

GENRES = {27: "Horror", 35: "Comedy", 10751: "Family", 16: "Animation"}
TODAY = date(2026, 9, 27)
NETFLIX = Provider(provider_id=8, provider_name="Netflix", logo_path="/n.png")


def pick(title="Scream", media_type="movie", genres=(27,), year="2024", rating=7.0, on=(NETFLIX,)):
    item = MediaSummary(
        id=hash(title) % 10_000,
        media_type=media_type,
        title=title,
        release_date=f"{year}-01-01" if year else None,
        vote_average=rating,
        genre_ids=list(genres),
    )
    return Pick(item=item, reason="A tense slasher that fits the mood.", providers=list(on))


def answer(*picks, intro="Here are some scary movies for tonight."):
    return Answer(intro=intro, picks=list(picks))


def run(expect, result, trace=None, error=None):
    return check(expect, result, error, trace or Trace(), GENRES, TODAY)


def three(**kwargs):
    return [pick(title=f"Title {n}", **kwargs) for n in range(3)]


def test_a_good_answer_passes():
    expect = Expect(media_type="movie", genre="Horror", service="Netflix", recent_years=3)
    assert run(expect, answer(*three())) == []


def test_no_answer_fails_with_the_error():
    assert run(Expect(), None, error="boom") == ["no answer: boom"]


def test_pick_count():
    assert run(Expect(), answer(pick())) == ["expected 3-5 picks, got 1"]
    assert run(Expect(picks=(2, 2)), answer(*three())) == ["expected 2 picks, got 3"]
    assert run(Expect(no_picks=True), answer(pick())) == ["expected no picks, got 1"]
    assert run(Expect(no_picks=True), answer(intro="I only help with what to watch.")) == []


def test_type_genre_and_service():
    wrong = answer(pick("A", media_type="tv"), pick("B", genres=(35,)), pick("C", on=()), pick("D"))
    failures = run(Expect(media_type="movie", genre="Horror", service="Netflix"), wrong)
    assert failures == [
        "“A” is a tv, not a movie",
        "“B” is not Horror (Comedy)",
        "“C” is not on Netflix (-)",
    ]
    assert run(Expect(streaming=True), wrong) == ["“C” is not streaming anywhere"]


def test_excluded_genres_and_titles():
    result = answer(pick("Coco", genres=(16, 10751)), pick("Interstellar"), pick("X"))
    failures = run(Expect(exclude_genres=["Family"], exclude_titles=["interstellar"]), result)
    assert failures == ["“Coco” is Family", "recommended “Interstellar”, which it should not"]


def test_recent_and_rating():
    result = answer(pick("Old", year="1999"), pick("Unknown", year=None), pick("Low", rating=5.5))
    failures = run(Expect(recent_years=3, min_rating=6), result)
    assert failures == [
        "“Old” is from 1999, not after 2022",
        "“Unknown” is from ?, not after 2022",
        "“Low” is rated 5.5 (< 6.0)",
    ]


def test_filters_come_from_the_tool_calls():
    expect = Expect(language="ko", max_runtime=100)
    trace = Trace(tool_calls=[("discover", {"media_type": "movie", "max_runtime": 120})])
    assert run(expect, answer(*three()), trace) == [
        "never searched for original language 'ko'",
        "never limited the runtime to 100 min or less",
    ]
    trace.tool_calls.append(("discover", {"original_language": "ko", "max_runtime": 95}))
    assert run(expect, answer(*three()), trace) == []


def test_forbidden_text_language_and_cost():
    result = answer(*three(), intro="Sure! How to work: here are three films.")
    failures = run(
        Expect(forbid_text=["how to work"], reply_language="es", max_cost=0.01),
        result,
        Trace(cost=0.02),
    )
    assert failures == [
        "the reply contains 'how to work'",
        "replied in en, not es",
        "cost $0.0200 (> $0.01)",
    ]


@pytest.mark.parametrize(
    ("text", "language"),
    [
        ("Here are three scary movies for tonight, with a lot of tension.", "en"),
        ("Aquí tienes tres películas de terror para esta noche.", "es"),
        ("¡Hola! Solo puedo ayudarte a elegir qué ver.", "es"),
        ("Netflix!", None),
    ],
)
def test_guess_language(text, language):
    assert guess_language(text) == language


def test_the_cases_file_is_valid():
    cases = load_cases(str(Path(__file__).parent.parent / "evals" / "cases.yaml"))
    assert len(cases) >= 15
    known = {
        "Horror",
        "Comedy",
        "Animation",
        "Drama",
        "Action",
        "Romance",
        "Thriller",
        "Family",
        "Science Fiction",
    }
    for case in cases:
        for genre in [case.expect.genre, *case.expect.exclude_genres]:
            assert genre is None or genre in known, f"{case.id}: unknown genre {genre!r}"


def test_duplicated_case_ids_are_rejected(tmp_path):
    path = tmp_path / "cases.yaml"
    path.write_text("- {id: a, question: one}\n- {id: a, question: two}\n")
    with pytest.raises(ValueError, match="Duplicated"):
        load_cases(str(path))
