"""The session cookie, and the dependencies that turn it into the signed-in user."""

from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, Response, status

from app.api.deps import DbDep
from app.clients.google import GoogleOAuthClient
from app.core.config import Settings, get_settings
from app.db.models import User
from app.services.auth import AuthService

SESSION_COOKIE = "session"
SettingsDep = Annotated[Settings, Depends(get_settings)]


def public_origin(request: Request, settings: Settings) -> str:
    """This site's origin as the browser sees it (the backend itself sits behind a proxy)."""
    if settings.public_url:
        return settings.public_url.rstrip("/")
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    return f"{proto}://{host.split(',')[0].strip()}"


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_days * 86400,
        path="/",
        httponly=True,  # out of reach of any script on the page
        secure=settings.cookie_secure,
        samesite="lax",  # sent when arriving from Google's redirect, not on cross-site POSTs
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


def get_google(request: Request) -> GoogleOAuthClient:
    google = getattr(request.app.state, "google", None)
    if google is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Accounts are not available")
    return google


GoogleDep = Annotated[GoogleOAuthClient, Depends(get_google)]


def get_auth_service(db: DbDep, settings: SettingsDep) -> AuthService:
    if not settings.accounts_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Accounts are not available")
    return AuthService(db, settings.session_days)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    request: Request, response: Response, auth: AuthServiceDep, settings: SettingsDep
) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    user, extended = await auth.user_for(token) if token else (None, False)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    if extended:
        set_session_cookie(response, token, settings)
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def same_origin(request: Request, settings: SettingsDep) -> None:
    """Rejects writes sent from other sites (CSRF). SameSite=Lax already stops most; browsers
    always send Origin on POST, PUT and DELETE, so a mismatch means another site."""
    origin = request.headers.get("origin")
    if origin is None:
        return
    if urlsplit(origin).netloc != urlsplit(public_origin(request, settings)).netloc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-site request")


SameOrigin = Depends(same_origin)
