from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import media
from app.clients.tmdb import TMDBClient, TMDBNotFoundError, TMDBUnavailableError
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.tmdb = TMDBClient(get_settings())
    yield
    await app.state.tmdb.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="MyMoviesApp API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.exception_handler(TMDBNotFoundError)
    async def not_found(_: Request, __: TMDBNotFoundError) -> JSONResponse:
        return JSONResponse({"detail": "Not found"}, status_code=404)

    @app.exception_handler(TMDBUnavailableError)
    async def unavailable(_: Request, __: TMDBUnavailableError) -> JSONResponse:
        return JSONResponse({"detail": "Upstream service unavailable"}, status_code=502)

    @app.get("/health", tags=["Health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # Order matters: routers with fixed prefixes (person, search) must be registered
    # before the generic /{media_type} routes, otherwise those would swallow them.
    app.include_router(media.router, prefix="/api/v1")
    return app


app = create_app()
