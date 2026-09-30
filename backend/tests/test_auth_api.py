import base64
import json
import time
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
import respx
from sqlalchemy import func, select

from app.clients.google import TOKEN_URL
from app.db.models import User, UserSession
from app.services.auth import safe_next, sign, unsign

ORIGIN = "https://site.test"
CLIENT_ID = "client-id.apps.googleusercontent.com"


@pytest.fixture
def settings(settings):
    settings.database_url = "sqlite+aiosqlite://"
    settings.google_client_id = CLIENT_ID
    settings.google_client_secret = "client-secret"
    settings.session_secret = "session-secret"
    return settings


@pytest.fixture
async def site(settings, db_sessionmaker):
    """The API as the browser sees it, over HTTPS (Secure cookies) and with a cookie jar."""
    from app.api.deps import get_sessionmaker
    from app.api.session import get_google
    from app.clients.google import GoogleOAuthClient
    from app.core.config import get_settings
    from app.main import create_app

    google = GoogleOAuthClient(settings)
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_sessionmaker] = lambda: db_sessionmaker
    app.dependency_overrides[get_google] = lambda: google
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=ORIGIN) as client:
        yield client
    await google.aclose()


def id_token(**overrides) -> str:
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "exp": int(time.time()) + 300,
        "sub": "google-123",
        "email": "ana@example.com",
        "email_verified": True,
        "name": "Ana",
        "picture": "https://lh3.googleusercontent.com/a/ana",
        **overrides,
    }

    def part(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()

    return f"{part({'alg': 'RS256'})}.{part(claims)}.signature"


async def start_login(site, next_path: str = "/movie/1/alien") -> dict[str, list[str]]:
    response = await site.get("/api/v1/auth/google/login", params={"next": next_path})
    assert response.status_code == 302
    return parse_qs(urlsplit(response.headers["location"]).query)


async def sign_in(site, **claims) -> httpx.Response:
    params = await start_login(site)
    with respx.mock:
        respx.post(TOKEN_URL).respond(json={"id_token": id_token(**claims)})
        return await site.get(
            "/api/v1/auth/google/callback", params={"code": "c0de", "state": params["state"][0]}
        )


async def count(db_sessionmaker, model) -> int:
    async with db_sessionmaker() as session:
        return await session.scalar(select(func.count()).select_from(model))


async def test_me_is_unavailable_when_accounts_are_not_set_up(api):
    assert (await api.get("/api/v1/me")).status_code == 503


async def test_me_is_401_when_signed_out(site):
    assert (await site.get("/api/v1/me")).status_code == 401


async def test_login_redirects_to_google_with_pkce(site):
    params = await start_login(site)

    assert params["client_id"] == [CLIENT_ID]
    assert params["redirect_uri"] == [f"{ORIGIN}/api/v1/auth/google/callback"]
    assert params["code_challenge_method"] == ["S256"]
    assert params["scope"] == ["openid email profile"]
    assert params["state"][0]
    assert "oauth_flow" in site.cookies


async def test_sign_in_sets_a_session_cookie_and_returns_to_the_page(site, db_sessionmaker):
    response = await sign_in(site)

    assert response.status_code == 302
    assert response.headers["location"] == "/movie/1/alien"
    cookie = response.headers.get_list("set-cookie")
    session_cookie = next(c for c in cookie if c.startswith("session="))
    for flag in ("HttpOnly", "Secure", "SameSite=lax", "Path=/"):
        assert flag in session_cookie
    me = await site.get("/api/v1/me")
    assert me.json() == {
        "name": "Ana",
        "email": "ana@example.com",
        "avatar_url": "https://lh3.googleusercontent.com/a/ana",
    }
    # Only the hash is stored, never the token itself.
    async with db_sessionmaker() as session:
        stored = await session.scalar(select(UserSession.token_hash))
    assert stored != site.cookies["session"]


async def test_signing_in_again_updates_the_same_user(site, db_sessionmaker):
    await sign_in(site)
    await sign_in(site, name="Ana María")

    assert await count(db_sessionmaker, User) == 1
    assert (await site.get("/api/v1/me")).json()["name"] == "Ana María"


async def test_callback_with_a_forged_state_does_not_sign_in(site, db_sessionmaker):
    await start_login(site)
    with respx.mock:
        token = respx.post(TOKEN_URL).respond(json={"id_token": id_token()})
        response = await site.get(
            "/api/v1/auth/google/callback", params={"code": "c0de", "state": "forged"}
        )

    assert response.status_code == 302
    assert not token.called
    assert await count(db_sessionmaker, UserSession) == 0


async def test_cancelling_on_google_goes_back_signed_out(site):
    params = await start_login(site)
    response = await site.get(
        "/api/v1/auth/google/callback",
        params={"error": "access_denied", "state": params["state"][0]},
    )

    assert response.headers["location"] == "/movie/1/alien"
    assert (await site.get("/api/v1/me")).status_code == 401


@pytest.mark.parametrize(
    "claims",
    [
        {"aud": "someone-else"},
        {"iss": "https://evil.test"},
        {"exp": int(time.time()) - 10},
        {"email_verified": False},
    ],
)
async def test_untrustworthy_id_tokens_are_rejected(site, db_sessionmaker, claims):
    await sign_in(site, **claims)

    assert await count(db_sessionmaker, User) == 0
    assert (await site.get("/api/v1/me")).status_code == 401


async def test_google_refusing_the_code_does_not_sign_in(site):
    params = await start_login(site)
    with respx.mock:
        respx.post(TOKEN_URL).respond(400, json={"error": "invalid_grant"})
        await site.get(
            "/api/v1/auth/google/callback", params={"code": "c0de", "state": params["state"][0]}
        )

    assert (await site.get("/api/v1/me")).status_code == 401


async def test_logout_ends_the_session(site, db_sessionmaker):
    await sign_in(site)
    response = await site.post("/api/v1/auth/logout", headers={"Origin": ORIGIN})

    assert response.status_code == 204
    assert await count(db_sessionmaker, UserSession) == 0
    assert (await site.get("/api/v1/me")).status_code == 401


async def test_logout_from_another_site_is_refused(site):
    await sign_in(site)
    response = await site.post("/api/v1/auth/logout", headers={"Origin": "https://evil.test"})

    assert response.status_code == 403
    assert (await site.get("/api/v1/me")).status_code == 200


async def test_expired_sessions_are_dropped(site, db_sessionmaker):
    await sign_in(site)
    async with db_sessionmaker() as session:
        stored = await session.scalar(select(UserSession))
        stored.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        await session.commit()

    assert (await site.get("/api/v1/me")).status_code == 401
    assert await count(db_sessionmaker, UserSession) == 0


async def test_active_sessions_are_extended(site, db_sessionmaker, settings):
    await sign_in(site)
    async with db_sessionmaker() as session:
        stored = await session.scalar(select(UserSession))
        stored.expires_at = datetime.now(UTC) + timedelta(days=2)
        await session.commit()

    response = await site.get("/api/v1/me")

    assert "session=" in response.headers.get("set-cookie", "")
    async with db_sessionmaker() as session:
        expires = await session.scalar(select(UserSession.expires_at))
    assert expires.replace(tzinfo=UTC) > datetime.now(UTC) + timedelta(days=29)


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("/movie/1/alien?x=1", "/movie/1/alien?x=1"),
        ("https://evil.test/", "/"),
        ("//evil.test/", "/"),
        ("/\\evil.test", "/"),
        (None, "/"),
    ],
)
def test_only_paths_on_this_site_are_followed(path, expected):
    assert safe_next(path) == expected


def test_signed_values_detect_tampering_and_expiry():
    value = sign({"state": "abc"}, "secret", max_age=60)

    assert unsign(value, "secret")["state"] == "abc"
    assert unsign(value, "other-secret") is None
    assert unsign(value[:-2] + "xx", "secret") is None
    assert unsign("garbage", "secret") is None
    assert unsign(sign({"state": "abc"}, "secret", max_age=-1), "secret") is None
