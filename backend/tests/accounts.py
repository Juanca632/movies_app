"""Helpers to sign in through a fake Google, for tests that need a signed-in user."""

import base64
import json
import time
from urllib.parse import parse_qs, urlsplit

import httpx
import respx

from app.clients.google import TOKEN_URL

ORIGIN = "https://site.test"
CLIENT_ID = "client-id.apps.googleusercontent.com"


def id_token(**overrides) -> str:
    """An ID token as Google's token endpoint returns it (the signature is never checked)."""
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
