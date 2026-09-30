import logging
import secrets

from fastapi import APIRouter, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.session import (
    SESSION_COOKIE,
    AuthServiceDep,
    GoogleDep,
    SameOrigin,
    SettingsDep,
    clear_session_cookie,
    public_origin,
    set_session_cookie,
)
from app.clients.google import GoogleAuthError
from app.core.config import Settings
from app.services.auth import pkce_pair, safe_next, sign, unsign

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Accounts"])

# Holds the OAuth state and PKCE verifier between the two redirects; only this router reads it.
FLOW_COOKIE = "oauth_flow"
FLOW_PATH = "/api/v1/auth"
FLOW_SECONDS = 600


def _callback_url(request: Request, settings: Settings) -> str:
    return f"{public_origin(request, settings)}{FLOW_PATH}/google/callback"


@router.get(
    "/google/login",
    summary="Start signing in with Google",
    description="Redirects to Google; afterwards the browser comes back to `next` (a path).",
    response_class=RedirectResponse,
)
async def google_login(
    request: Request,
    google: GoogleDep,
    auth: AuthServiceDep,  # 503 before leaving for Google when accounts are off
    settings: SettingsDep,
    next: str = "/",
) -> RedirectResponse:
    verifier, challenge = pkce_pair()
    flow = {"state": secrets.token_urlsafe(24), "verifier": verifier, "next": safe_next(next)}
    url = google.authorize_url(
        redirect_uri=_callback_url(request, settings), state=flow["state"], code_challenge=challenge
    )
    response = RedirectResponse(url, status.HTTP_302_FOUND)
    response.set_cookie(
        FLOW_COOKIE,
        sign(flow, settings.session_secret or "", FLOW_SECONDS),
        max_age=FLOW_SECONDS,
        path=FLOW_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return response


@router.get(
    "/google/callback",
    summary="Where Google sends the browser back",
    response_class=RedirectResponse,
    include_in_schema=False,
)
async def google_callback(
    request: Request,
    google: GoogleDep,
    auth: AuthServiceDep,
    settings: SettingsDep,
    code: str | None = None,
    state: str | None = None,
) -> RedirectResponse:
    flow = unsign(request.cookies.get(FLOW_COOKIE, ""), settings.session_secret or "") or {}
    response = RedirectResponse(safe_next(flow.get("next")), status.HTTP_302_FOUND)
    response.delete_cookie(FLOW_COOKIE, path=FLOW_PATH)

    # Cancelled on Google's page, a stale tab, or a forged callback: back to where they were,
    # still signed out.
    if not code or not state or state != flow.get("state"):
        return response
    try:
        account = await google.exchange(
            code=code,
            code_verifier=flow["verifier"],
            redirect_uri=_callback_url(request, settings),
        )
    except GoogleAuthError as exc:
        log.warning("Google sign-in failed: %s", exc)
        return response

    set_session_cookie(response, await auth.sign_in(account), settings)
    return response


@router.post(
    "/logout",
    summary="Sign out this browser",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[SameOrigin],
)
async def logout(request: Request, auth: AuthServiceDep, settings: SettingsDep) -> Response:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await auth.sign_out(token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response, settings)
    return response
