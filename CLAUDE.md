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
- `frontend/` — React 19 + TypeScript + Vite 6, Tailwind 4 (sin Sass), React Query, react-router 7 (data router, páginas lazy).
  - `src/api/`: `client.ts` (`getJson`, `ApiError`; base `VITE_API_URL` o `:8000/api/v1` en local, `/api/v1` en prod), `queries.ts` (hooks React Query), `types.ts` (espejo de `backend/app/schemas`)
  - `src/components/` presentacionales (cards, `Row` carrusel con scroll nativo, `Hero`, `DetailHero`); `src/pages/` una por ruta, `MediaPage` sirve movie y tv
  - Diseño: estilo streaming oscuro, acento ámbar; tokens en `src/index.css` (`@theme`). Fuentes Inter + Outfit.
  - URLs públicas: `/movie/:id/:slug`, `/tv-show/:id/:slug` (se mantiene por enlaces antiguos), `/person/:id/:slug`, `/search?q=`
  - Tests: Vitest + Testing Library; `src/test-utils/render.tsx` monta el router real con `fetch` mockeado
- `docker-compose.yml` — backend + frontend (nginx :3000→80, proxifica `/api/` al backend).
- `.github/workflows/ci.yml` (PR a main/develop: backend audit+ruff+pytest, frontend audit+lint+test+build, docker build) y `cd.yml` (push a main: tag semver + Release; NO despliega).

## Comandos

- Backend: `cd backend && source myvenv/bin/activate && pip install -r requirements-dev.txt && uvicorn app.main:app --reload`
- Tests/lint backend: `pytest -q` y `ruff check .` (desde `backend/`)
- Frontend: `cd frontend && npm run dev` | `npm test` | `npm run build` | `npm run lint`
- Ambos: `./start.sh`

## Convenciones

- Ramas: trabajo en `develop`, PR a `main`. Commits estilo Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, ...). El CD calcula la versión a partir de ellos (`fix`→patch, `feat`→minor, `breaking`→major), así que respétalos.
- Código y commits en inglés; conversación con el usuario en español.
- Secretos siempre en `.env` (ignorado). Nunca hardcodear keys (ya hubo un incidente con la key de TMDB, commit 9924824; esa key debe considerarse comprometida/rotada).
- `frontend/dist` no se versiona.

## Problemas conocidos / deuda

- CD solo crea releases; no hay despliegue automático.
- No hay base de datos todavía; el único estado es la caché en memoria.
- Sin Docker en el WSL de desarrollo: los Dockerfiles solo se validan en el job `docker` del CI (pasó en el PR de la Fase 0).
- Verificar que el reverse proxy de producción reenvíe `/api/v1/...` al backend (o fijar `VITE_API_URL` al construir).

## Roadmap

- Fase 0 (HECHA, mergeada a `main`): backend reescrito con httpx, API unificada, búsqueda, Docker y CI.
- Fase 1 (HECHA en `develop`, pendiente PR a `main`): frontend reescrito + rediseño + buscador con sugerencias + tests. Pendiente elegir nombre de la app (propuesta: "Marquee"). Next.js descartado por ahora (se puede migrar luego; componentes y hooks son portables).
- Fase 2: Postgres, login con Google (cookie httpOnly), favoritos y "Mi lista".
- Fase 3: recomendaciones con IA a partir de favoritos.
- Fase 4: despliegue real + CD, README con capturas.
