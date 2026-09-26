# MyMoviesApp

Proyecto de portafolio: explorador de películas/series/actores sobre la API de TMDB. Demo en producción (Vercel): https://movies-app-swart-xi.vercel.app. Se está evolucionando hacia: login con Google, favoritos por usuario y recomendaciones con IA.

## Producto

- La app es pública: cualquiera ve películas, series, actores y puede buscar, sin cuenta.
- Login (Google) es opcional; con cuenta: favoritos, "Mi lista", perfil y recomendaciones con IA.
- Interfaz en inglés. Rutas públicas bajo `/api/v1/...`; las privadas irán bajo `/api/v1/me/...`.

## Estructura

- `backend/app/` — FastAPI (Python 3.12), proxy con caché sobre TMDB.
  - `clients/tmdb.py` único punto que habla con TMDB (httpx async, reintentos, caché TTL)
  - `clients/omdb.py` OMDb (datos de IMDb: premios y notas IMDb/Rotten Tomatoes/Metacritic). Opcional: sin `OMDB_API_KEY` o si falla, `/acclaim/{imdb_id}` devuelve vacío y el frontend oculta la sección. Plan gratis: 1000 peticiones/día (caché 1 día); no usarlo en el hover
  - `services/` lógica y normalización (movie/tv → `title`, `release_date`); `schemas/` modelos de respuesta
  - `api/v1/` routers: `media` (`/{media_type}`, `/{media_type}/{id}`, `/tv/{id}/season/{n}`), `people`, `search`, `acclaim` (`/acclaim/{imdb_id}`), `collections` (`/collection/{id}`, sagas con las partes en orden de estreno), `releases` (`/releases/theaters|home|tv?month=YYYY-MM&region=`), `discover` (`/genres/{mt}`, `/regions`, `/providers/{mt}?region=`, `/discover/{mt}?genre=&provider=&region=&sort=`), `assistant` (`POST /ask` con `{question, region, history}`, responde Server-Sent Events). Los routers con prefijo fijo se registran ANTES de `media` en `main.py`.
  - `services/releases.py` (calendario): `discover` con `region` filtra por la fecha local pero devuelve la fecha principal, así que se consulta `/movie/{id}/release_dates` por película (hasta 60, caché 1 día; la primera carga de un mes tarda unos segundos). Se descartan reestrenos (estreno original de hace más de un año). Series: estreno mundial (`first_air_date`), solo ficción.
  - `api/share.py` + `services/share.py`: vistas previas de enlaces (Open Graph) en las URLs públicas (`/movie/...`, `/tv-show/...`, `/person/...`, fuera de `/api`). Solo las reciben los bots de vista previa (WhatsApp, Telegram...): la regla por user-agent está duplicada en `vercel.json` y `frontend/nginx.conf`, mantenerlas iguales
  - `services/assistant.py`: asistente con IA (Claude Haiku 4.5, SDK `anthropic`, bucle de tool calling escrito a mano). Herramientas = nuestros servicios de TMDB (`discover`, `search_titles`, `similar_to`, `where_to_watch`) + `present_picks` para la respuesta final. Solo acepta títulos que alguna herramienta devolvió; si responde en texto se le fuerza `present_picks` (`tool_choice`). Opcional: sin `ANTHROPIC_API_KEY`, `/ask` da 503. Cuesta dinero (~1-2 céntimos/pregunta): límites en memoria por IP (10/h) y del sitio (300/día), caché de respuestas 1 h (solo primeras preguntas: los seguimientos dependen de la conversación); loguea tokens y coste. Conversación: el modelo no tiene memoria, así que el frontend reenvía un resumen de hasta 5 turnos anteriores (pregunta + títulos recomendados) y el backend lo antepone a la pregunta nueva. Tests con un Claude falso (`tests/test_assistant_api.py`), nunca contra la API real. `scripts/agent_playground.py`: el bucle mínimo, para experimentar
  - `core/config.py` pydantic-settings (`.env`: `THE_MOVIE_DB_API_KEY`, opcionales `OMDB_API_KEY`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`, ...)
  - `tests/` pytest + respx (TMDB mockeado, sin red)
- `frontend/` — React 19 + TypeScript + Vite 6, Tailwind 4 (sin Sass), React Query, react-router 7 (data router, páginas lazy).
  - `src/api/`: `client.ts` (`getJson`, `ApiError`; base `VITE_API_URL` o `:8000/api/v1` en local, `/api/v1` en prod), `queries.ts` (hooks React Query), `types.ts` (espejo de `backend/app/schemas`)
  - `src/components/` presentacionales (cards, `Row` carrusel con scroll nativo, `Hero`, `DetailHero`, `RegionPicker`); `src/pages/` una por ruta, `MediaPage` sirve movie y tv, `BrowsePage` filtra por género/plataforma
  - País: `src/lib/region.ts` (store con `useSyncExternalStore`, se detecta de `navigator.languages`, se guarda en `localStorage`). Lo usan los hooks de detalle, estrenos (`now_playing`/`upcoming`) y el filtro de plataformas
  - Diseño: estilo streaming oscuro, acento ámbar; tokens en `src/index.css` (`@theme`). Fuentes Inter + Outfit.
  - URLs públicas: `/movie/:id/:slug`, `/tv-show/:id/:slug?season=` (se mantiene por enlaces antiguos), `/person/:id/:slug`, `/search?q=`, `/browse/movie|tv?genre=&provider=&sort=`, `/calendar?kind=theaters|home|tv&month=YYYY-MM`, `?ask=` en cualquier URL (asistente con IA)
  - Asistente IA: `components/AssistantPanel.tsx`, panel lateral (≥ sm) u hoja inferior (móvil) sobre la página actual; abierto mientras la URL tenga `?ask` (`lib/askPanel.ts`; un enlace `?ask=pregunta` la pregunta al llegar y se limpia). La conversación vive en `lib/chat.ts` (store fuera de React, sigue aunque se cierre el panel; se guarda en `localStorage`, máx. 20 turnos, botón "New chat"). Con login (Fase 2) pasaría a la base de datos. Entradas: "Ask AI" en la navbar y en `BottomNav` (barra de pestañas del móvil), `AskBar` bajo el banner de la home y la opción "Ask AI" del buscador con consultas de 3+ palabras. `src/api/assistant.ts` lee el stream SSE. Estilo IA discreto: icono ✦ con degradado y borde fino `ai-ring` (utilidades `ai-*` en `index.css`)
  - Tests: Vitest + Testing Library; `src/test-utils/render.tsx` monta el router real con `fetch` mockeado
- `docker-compose.yml` — backend + frontend (nginx :3000→80, proxifica `/api/` al backend).
- `vercel.json` — despliegue en Vercel (Hobby, gratis) con Services (beta): servicio `frontend` (Vite, con fallback SPA a `index.html`) y `backend` (FastAPI como función, detecta `app/main.py`); `/api/*` va al backend. Las cabeceras de seguridad (CSP...) están duplicadas aquí y en `frontend/nginx.conf`: mantenerlas iguales. Secretos en las env vars del proyecto de Vercel. Ojo: en `backend/` no debe haber `pyproject.toml` (Vercel lo prioriza sobre `requirements.txt` y, sin lista de dependencias, despliega sin FastAPI); la config de ruff/pytest vive en `ruff.toml` y `pytest.ini`. El límite de peticiones en Vercel es una regla del Firewall (1 por proyecto en Hobby), configurada en el dashboard.
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
- No hay base de datos todavía; el único estado es la caché en memoria (y los límites del asistente, que en Vercel son por instancia, no exactos).
- Sin Docker en el WSL de desarrollo: los Dockerfiles solo se validan en el job `docker` del CI (pasó en el PR de la Fase 0).
- El dominio `mymoviesapp.xyz` aparece aparcado en Afternic (probablemente caducado): comprobar en el registrador o usar otro dominio.

## Roadmap

- Fase 0 (HECHA, mergeada a `main`): backend reescrito con httpx, API unificada, búsqueda, Docker y CI.
- Fase 1 (HECHA, en `main`): frontend reescrito + rediseño + buscador con sugerencias + tests. Pendiente elegir nombre de la app (propuesta: "Marquee"). Next.js descartado por ahora (se puede migrar luego; componentes y hooks son portables).
- Fase 2: Postgres, login con Google (cookie httpOnly), favoritos y "Mi lista".
- Fase 3 (EMPEZADA): asistente "qué veo esta noche" en lenguaje natural (`/ask`). Siguiente: evals del asistente en CI, modo grupo, y con la Fase 2 embeddings (pgvector) + recomendaciones a partir de favoritos.
- Fase 4 (casi HECHA): desplegado en Vercel (se publica al mergear a `main`), README con capturas en `docs/screenshots/`. Falta: dominio propio y, si hace falta, la regla de rate limit del Firewall de Vercel.
- Extra ya hecho: directores/creadores y créditos de equipo, sagas, temporadas y episodios, calendario de estrenos, vistas previas de enlaces compartidos (Open Graph), browse por género/plataforma, país con banderas, hover previews, tráileres, premios/notas (OMDb), revisión de seguridad.
