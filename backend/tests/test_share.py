import httpx
import respx

BASE = "https://tmdb.test/3"


def og(html: str, prop: str) -> str | None:
    attr = "name" if prop.startswith("twitter:") else "property"
    marker = f'<meta {attr}="{prop}" content="'
    start = html.find(marker)
    if start == -1:
        return None
    start += len(marker)
    return html[start : html.index('"', start)]


@respx.mock
async def test_movie_preview_describes_the_title(api):
    respx.get(f"{BASE}/movie/27205").mock(
        return_value=httpx.Response(
            200,
            json={
                "id": 27205,
                "title": "Inception",
                "overview": "A thief who steals corporate secrets through dreams.",
                "backdrop_path": "/back.jpg",
                "poster_path": "/poster.jpg",
                "release_date": "2010-07-15",
            },
        )
    )

    response = await api.get("/movie/27205/inception")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    html = response.text
    assert og(html, "og:title") == "Inception (2010)"
    assert og(html, "og:description") == "A thief who steals corporate secrets through dreams."
    assert og(html, "og:image") == "https://image.tmdb.org/t/p/w780/back.jpg"
    assert og(html, "og:type") == "video.movie"
    assert "<title>Inception (2010) · MyMoviesApp</title>" in html


@respx.mock
async def test_tv_preview_uses_the_tv_show_url_and_falls_back_to_the_poster(api):
    respx.get(f"{BASE}/tv/1396").mock(
        return_value=httpx.Response(
            200, json={"id": 1396, "name": "Breaking Bad", "poster_path": "/bb.jpg"}
        )
    )

    html = (await api.get("/tv-show/1396")).text

    assert og(html, "og:title") == "Breaking Bad"
    assert og(html, "og:image") == "https://image.tmdb.org/t/p/w500/bb.jpg"
    assert og(html, "og:type") == "video.tv_show"
    # No overview: the site description stands in.
    assert og(html, "og:description").startswith("Discover movies")


@respx.mock
async def test_person_preview_truncates_long_biographies(api):
    respx.get(f"{BASE}/person/525").mock(
        return_value=httpx.Response(
            200,
            json={"id": 525, "name": "Christopher Nolan", "biography": "word " * 100},
        )
    )

    html = (await api.get("/person/525/christopher-nolan")).text

    assert og(html, "og:title") == "Christopher Nolan"
    description = og(html, "og:description")
    assert description.endswith("…")
    assert len(description) <= 200
    assert og(html, "og:image") is None
    assert og(html, "twitter:card") == "summary"


@respx.mock
async def test_preview_escapes_html_in_tmdb_text(api):
    respx.get(f"{BASE}/movie/1").mock(
        return_value=httpx.Response(
            200, json={"id": 1, "title": '"><script>alert(1)</script>', "overview": "a & b"}
        )
    )

    html = (await api.get("/movie/1")).text

    assert "<script>" not in html
    assert og(html, "og:title") == "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"
    assert og(html, "og:description") == "a &amp; b"


@respx.mock
async def test_unknown_title_gets_the_generic_card(api):
    respx.get(f"{BASE}/movie/404").mock(return_value=httpx.Response(404))

    response = await api.get("/movie/404/missing")

    assert response.status_code == 404
    assert og(response.text, "og:title") == "MyMoviesApp"
