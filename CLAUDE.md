# MyMoviesApp

Proyecto de portafolio: explorador de películas/series/actores sobre la API de TMDB. Demo en producción: https://mymoviesapp.xyz. Se está evolucionando hacia: login con Google, favoritos por usuario y recomendaciones con IA.

## Producto

- La app es pública: cualquiera ve películas, series, actores y puede buscar, sin cuenta.
- Login (Google) es opcional; con cuenta: favoritos, "Mi lista", perfil y recomendaciones con IA.
- Interfaz en inglés. Rutas públicas bajo `/api/v1/...`; las privadas irán bajo `/api/v1/me/...`.

## Estructura

- `backend/app/` — FastAPI (Python 3.12), proxy con caché sobre TMDB.
  - `clients/tmdb.py` único punto que habla con TMDB (httpx async, reintentos, caché TTL)
  - `services/` lógica y normalización (movie/tv → `title`, `release_date`); `schemas/` modelos de respuesta
  - `api/v1/` routers: `media` (`/{media_type}`, `/{media_type}/{id}`), `people`, `search`. Los routers con prefijo fijo se registran ANTES de `media` en `main.py`.
  - `core/config.py` pydantic-settings (`.env`: `THE_MOVIE_DB_API_KEY`, opcional `CORS_ORIGINS`, ...)
  - `tests/` pytest + respx (TMDB mockeado, sin red)
- `frontend/` — React 19 + TypeScript + Vite 6, Tailwind 4 + Sass, React Query, Zustand, react-router 7.
  - `src/hooks/API/API.ts`: `fetchData`/`fetchList`; base `VITE_API_URL` o `:8000/api/v1` en local, `/api/v1` en prod
  - Pendiente: refactor completo del frontend (hay componentes duplicados, reintentos manuales con setInterval)
- `docker-compose.yml` — backend + frontend (nginx :3000→80, proxifica `/api/` al backend).
- `.github/workflows/ci.yml` (PR a main/develop: backend audit+ruff+pytest, frontend audit+lint+build, docker build) y `cd.yml` (push a main: tag semver + Release; NO despliega).

## Comandos

- Backend: `cd backend && source myvenv/bin/activate && pip install -r requirements-dev.txt && uvicorn app.main:app --reload`
- Tests/lint backend: `pytest -q` y `ruff check .` (desde `backend/`)
- Frontend: `cd frontend && npm run dev` | `npm run build` | `npm run lint`
- Ambos: `./start.sh`

## Convenciones

- Ramas: trabajo en `develop`, PR a `main`. Commits estilo Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, ...). El CD calcula la versión a partir de ellos (`fix`→patch, `feat`→minor, `breaking`→major), así que respétalos.
- Código y commits en inglés; conversación con el usuario en español.
- Secretos siempre en `.env` (ignorado). Nunca hardcodear keys (ya hubo un incidente con la key de TMDB, commit 9924824; esa key debe considerarse comprometida/rotada).
- `frontend/dist` no se versiona.

## Problemas conocidos / deuda

- El frontend no tiene tests, y `serve` sigue en sus dependencias sin usarse.
- CD solo crea releases; no hay despliegue automático.
- No hay base de datos todavía; el único estado es la caché en memoria.
- Los Dockerfiles no se han probado en local (sin Docker en el entorno de desarrollo WSL); los valida el job `docker` del CI.

## Roadmap

- Fase 0 (hecha en `refactor/backend-v1`): backend reescrito con httpx, API unificada, búsqueda, Docker y CI.
- Fase 1: refactor del frontend + tests.
- Fase 2: Postgres, login con Google (cookie httpOnly), favoritos y "Mi lista".
- Fase 3: recomendaciones con IA a partir de favoritos.
- Fase 4: despliegue real + CD, README con capturas.
