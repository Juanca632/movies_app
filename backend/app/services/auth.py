import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.google import GoogleAccount
from app.db.models import User, UserSession

# A sliding expiry would mean a write on every request; once a day is plenty.
_REFRESH_AFTER = timedelta(days=1)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def pkce_pair() -> tuple[str, str]:
    """A random code verifier and its S256 challenge."""
    verifier = secrets.token_urlsafe(48)
    return verifier, _b64(hashlib.sha256(verifier.encode()).digest())


def sign(data: dict, secret: str, max_age: int) -> str:
    """Pack `data` into a tamper-proof string that expires after `max_age` seconds."""
    body = _b64(json.dumps({**data, "exp": int(time.time()) + max_age}).encode())
    mac = hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(mac)}"


def unsign(value: str, secret: str) -> dict | None:
    """The data packed by `sign`, or None if it was altered or has expired."""
    try:
        body, mac = value.split(".")
        expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_unb64(mac), expected):
            return None
        data = json.loads(_unb64(body))
    except ValueError:
        return None
    return data if data.get("exp", 0) >= time.time() else None


def safe_next(path: str | None) -> str:
    """Where to send the user after signing in: only a path on this site, never another host."""
    if not path or not path.startswith("/") or path.startswith("//") or "\\" in path:
        return "/"
    return path


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _aware(moment: datetime) -> datetime:
    # SQLite hands back naive datetimes; Postgres keeps the zone. Everything here is UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class AuthService:
    def __init__(self, db: AsyncSession, session_days: int) -> None:
        self._db = db
        self._lifetime = timedelta(days=session_days)

    async def sign_in(self, account: GoogleAccount) -> str:
        """Create or refresh the user, open a session and return its token for the cookie."""
        user = await self._db.scalar(select(User).where(User.google_sub == account.sub))
        if user is None:
            user = User(google_sub=account.sub)
            self._db.add(user)
        user.email, user.name, user.avatar_url = account.email, account.name, account.picture
        await self._db.flush()

        token = secrets.token_urlsafe(32)
        expires = datetime.now(UTC) + self._lifetime
        self._db.add(UserSession(token_hash=_hash(token), user_id=user.id, expires_at=expires))
        await self._db.commit()
        return token

    async def user_for(self, token: str) -> tuple[User | None, bool]:
        """The signed-in user for a cookie's token, and whether the session was extended
        (so the cookie should be too). Expired sessions are dropped."""
        session = await self._db.get(UserSession, _hash(token))
        if session is None:
            return None, False
        now = datetime.now(UTC)
        expires = _aware(session.expires_at)
        if expires <= now:
            await self._db.delete(session)
            await self._db.commit()
            return None, False
        extended = expires - now < self._lifetime - _REFRESH_AFTER
        if extended:
            session.expires_at = now + self._lifetime
            await self._db.commit()
        return await self._db.get(User, session.user_id), extended

    async def sign_out(self, token: str) -> None:
        session = await self._db.get(UserSession, _hash(token))
        if session is not None:
            await self._db.delete(session)
            await self._db.commit()

    async def delete_account(self, user: User) -> None:
        """Delete the user; the database cascades to their sessions and lists."""
        await self._db.delete(user)
        await self._db.commit()
