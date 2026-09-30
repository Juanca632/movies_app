from uuid import uuid4

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# libpq options that providers such as Neon put in the URL, but asyncpg does not accept.
_LIBPQ_ONLY = ("sslmode", "channel_binding")


def async_url(url: str) -> str:
    """Turn a plain postgres:// URL into one for SQLAlchemy's asyncpg driver."""
    parsed = make_url(url)
    if parsed.drivername in ("postgres", "postgresql", "postgresql+psycopg2"):
        parsed = parsed.set(drivername="postgresql+asyncpg")
    if parsed.drivername == "postgresql+asyncpg":
        query = {k: v for k, v in parsed.query.items() if k not in _LIBPQ_ONLY}
        if parsed.query.get("sslmode") in ("require", "verify-ca", "verify-full"):
            query["ssl"] = "require"
        parsed = parsed.set(query=query)
    return parsed.render_as_string(hide_password=False)


def create_engine(url: str) -> AsyncEngine:
    # Serverless functions come and go, so no pool of our own: the provider's pooler
    # (PgBouncer on Neon) keeps the connections. PgBouncer in transaction mode also
    # breaks asyncpg's named prepared statements, hence no statement cache and unique names.
    return create_async_engine(
        async_url(url),
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        },
    )


def create_sessionmaker(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)
