import asyncio
from logging.config import fileConfig

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from alembic import context
from app.db.engine import async_url
from app.db.models import Base

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)


class MigrationSettings(BaseSettings):
    """Only the database URLs: migrations must not need the TMDB key or anything else."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # Neon also sets a direct URL; schema changes should not go through the pooler.
    database_url_unpooled: str | None = None


def run(connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    settings = MigrationSettings()
    url = async_url(settings.database_url_unpooled or settings.database_url)
    engine = create_async_engine(url, poolclass=NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(run)
    await engine.dispose()


asyncio.run(run_online())
