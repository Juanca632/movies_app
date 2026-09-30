import base64
import json
import time
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import Settings

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
ISSUERS = ("https://accounts.google.com", "accounts.google.com")


class GoogleAuthError(Exception):
    """Google refused the code, or its answer did not add up."""


@dataclass(frozen=True)
class GoogleAccount:
    sub: str
    email: str
    name: str
    picture: str | None


class GoogleOAuthClient:
    """OpenID Connect sign-in with Google: the authorization code flow with PKCE."""

    def __init__(self, settings: Settings, http: httpx.AsyncClient | None = None) -> None:
        self._client_id = settings.google_client_id or ""
        self._client_secret = settings.google_client_secret or ""
        self._http = http or httpx.AsyncClient(timeout=10.0)

    async def aclose(self) -> None:
        await self._http.aclose()

    def authorize_url(self, *, redirect_uri: str, state: str, code_challenge: str) -> str:
        params = {
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
        }
        return f"{AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange(self, *, code: str, code_verifier: str, redirect_uri: str) -> GoogleAccount:
        try:
            response = await self._http.post(
                TOKEN_URL,
                data={
                    "code": code,
                    "code_verifier": code_verifier,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
        except httpx.HTTPError as exc:
            raise GoogleAuthError(f"token request failed: {exc}") from exc
        if not response.is_success:
            raise GoogleAuthError(f"token request answered {response.status_code}")
        try:
            claims = _claims(response.json()["id_token"])
        except (KeyError, IndexError, ValueError) as exc:
            raise GoogleAuthError("no readable id_token") from exc
        return self._account(claims)

    def _account(self, claims: dict) -> GoogleAccount:
        # The token came straight from Google's token endpoint over TLS, in exchange for our
        # client secret, so OpenID Connect allows trusting it without checking the signature.
        # The claims that tie it to this app and this moment are still checked.
        if claims.get("iss") not in ISSUERS or claims.get("aud") != self._client_id:
            raise GoogleAuthError("id_token is not for this app")
        if claims.get("exp", 0) < time.time():
            raise GoogleAuthError("id_token expired")
        if not claims.get("sub") or not claims.get("email") or not claims.get("email_verified"):
            raise GoogleAuthError("account without a verified email")
        return GoogleAccount(
            sub=str(claims["sub"]),
            email=claims["email"],
            name=claims.get("name") or claims["email"].split("@")[0],
            picture=claims.get("picture"),
        )


def _claims(id_token: str) -> dict:
    payload = id_token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
