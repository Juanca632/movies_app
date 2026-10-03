# MyMoviesApp

Portfolio project: a streaming-style explorer for movies, TV shows and people on top of the TMDB API, with an AI assistant that recommends what to watch. Live demo (Vercel): https://movies-app-swart-xi.vercel.app

## Product

- Public app: anyone can browse movies, shows and people and search, without an account.
- Google sign-in (optional) unlocks favourites, "My list", a profile and personal AI recommendations.
- The UI is in English. Public API routes live under `/api/v1/...`; private ones live under `/api/v1/me/...`.

## Setup and commands

- Backend (from `backend/`): `source myvenv/bin/activate && pip install -r requirements-dev.txt && uvicorn app.main:app --reload`
- Frontend (from `frontend/`): `npm ci`, then `npm run dev`
- Both at once: `./start.sh`
- Secrets go in `backend/.env` (git-ignored): `THE_MOVIE_DB_API_KEY` (required), `OMDB_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `SESSION_SECRET` (sign-in), `PUBLIC_URL`, `CORS_ORIGINS` (optional). Everything optional degrades gracefully when missing.

## Testing

Run before every commit, the same checks CI runs on each PR:

- Backend (from `backend/`): `ruff check .` and `pytest -q`
- Frontend (from `frontend/`): `npm run lint`, `npm test` and `npm run build`

Rules:

- Tests never touch the network: TMDB is mocked with respx, and Claude with a fake client (`tests/test_assistant_api.py`).
- Frontend tests (Vitest + Testing Library) mount the real router with a mocked `fetch` (`src/test-utils/render.tsx`).
- Add or update tests with every behaviour change.
- **After changing the AI assistant's prompt, tools or model, run the evals** (`python -m evals.run` from `backend/`, ~$0.20 per run, real Claude and TMDB) and compare the pass rate with the previous run. See "AI assistant" below.

## Code style

- Code, comments and commit messages in English.
- Python 3.12, ruff (config in `backend/ruff.toml`, line length 100). Pydantic models for every response (`app/schemas/`).
- TypeScript + React 19, ESLint. Tailwind 4 only (no Sass); design tokens in `src/index.css` (`@theme`).
- Match the surrounding code: short docstrings and comments that explain *why*, not *what*.

## Project structure

### Backend: `backend/app/` (FastAPI, a cached proxy over TMDB)

- `clients/tmdb.py` is the only place that talks to TMDB (async httpx, retries, TTL cache).
- `clients/omdb.py`: IMDb data from OMDb (awards, IMDb / Rotten Tomatoes / Metacritic scores). Free plan: 1000 requests/day, cached 1 day, so never call it on hover. Without a key, or on failure, `/acclaim/{imdb_id}` returns empty and the frontend hides the section.
- `services/`: logic and normalization (movie and TV share `title` and `release_date`). `schemas/`: response models, mirrored in `frontend/src/api/types.ts`.
- `api/v1/` routers: `media`, `people`, `search`, `acclaim`, `collections` (sagas in release order), `releases` (calendar), `discover` (genres, regions, providers, filtered discover) `assistant` (`POST /ask`), `auth` (Google sign-in) and `me` (the signed-in user and their lists). Routers with a fixed prefix are registered **before** `media` in `main.py`, because `media` matches `/{media_type}`.
- `services/releases.py` (calendar): TMDB's `discover` with `region` filters by local date but returns the primary date, so each movie's `/release_dates` is fetched (up to 60, cached 1 day; the first load of a month takes a few seconds). Re-releases are dropped; TV uses the worldwide `first_air_date`, fiction only.
- `api/share.py` + `services/share.py`: Open Graph link previews on the public URLs (outside `/api`), served only to preview bots, matched by user agent.
- `core/config.py`: pydantic-settings.
- `db/`: SQLAlchemy 2 async models (`users`, `sessions`, `saved_titles`) and the engine. Postgres on Neon in production, via its pooled URL with `NullPool` (serverless). `DbDep` in `api/deps.py` answers 503 without `DATABASE_URL`.
- Accounts (`clients/google.py`, `services/auth.py`, `api/session.py`):
  - Google sign-in is the OAuth code flow with PKCE, run by the backend: `/auth/google/login?next=/path` → Google → `/auth/google/callback`. State and verifier travel in a signed 10-minute cookie. The ID token comes straight from Google's token endpoint, so its claims are checked (iss, aud, exp, verified email) but not its signature.
  - The session is a random token in an `httpOnly; Secure; SameSite=Lax` cookie; only its SHA-256 lives in `sessions`. 30 days, extended at most once a day.
  - Private routes use `CurrentUserDep` (401 signed out); writes also add `SameOrigin` (403 if `Origin` is another site). `/me` answers 503 when accounts aren't set up (all of `DATABASE_URL` and the three Google/session keys), so the UI hides sign-in.
  - Lists (`services/lists.py`): `GET /me/{favorite|watchlist}`, `PUT` and `DELETE /me/{kind}/{movie|tv}/{id}` (idempotent); `DELETE /me` deletes the account, cascading to sessions and lists. Saving stores a snapshot (title, poster, date) from the cached detail, so a list renders without TMDB; at most 1000 titles per list. The frontend loads whole lists to know what is saved.
  - Recommendations (`services/recommendations.py`, `GET /me/recommendations`): TMDB's recommendations for the 10 newest titles of each list (cached details), favourites weighing double, titles recommended by several saves ranking higher, saved titles left out. Gives the top picks and up to 3 "Because you liked" rows. No AI, no extra cost.
  - The redirect URI is built from `PUBLIC_URL`, else from the request's forwarded host.
- Migrations: Alembic in `backend/alembic/`. Run `alembic upgrade head` by hand from `backend/` (never when a Vercel function starts); it prefers `DATABASE_URL_UNPOOLED` when set. After changing a model, add a migration (`alembic revision --autogenerate -m "..."`, then review it). Tests use in-memory SQLite (`db_sessionmaker` fixture); the CI `migrations` job checks them on real Postgres with `alembic check`.

### Frontend: `frontend/` (React 19, TypeScript, Vite 6, React Query, react-router 7 data router with lazy pages)

- `src/api/`: `client.ts` (`getJson`, `sendJson`, `ApiError`; base URL `VITE_API_URL`, else `/api/v1`: same origin everywhere, through Vite's dev proxy (which keeps the Host header, needed for sign-in) locally), `queries.ts` (React Query hooks), `types.ts`.
- `src/components/`: presentational components; `src/pages/`: one per route (`MediaPage` serves both movies and TV).
- Accounts: `useAccount` (signed-in / signed-out / unavailable, from `GET /me`), `useSavedList`, `useToggleSaved` (optimistic) and `useSignOut` in `queries.ts`. `AccountMenu` in the navbar, `SaveButtons` on the detail page and hover preview, `pages/MyListPage.tsx`, and `TopPicksRow` / `BecauseYouLikedRows` on the home page (`useForYou`, asked for only once something is saved). Sign-in is a plain link to `/api/v1/auth/google/login?next=`. Without accounts on the server none of it renders.
- Country: `src/lib/region.ts`, a `useSyncExternalStore` store detected from `navigator.languages` and saved in `localStorage`.
- Design: dark streaming style, amber accent, Inter + Outfit fonts.
- Public URLs: `/movie/:id/:slug`, `/tv-show/:id/:slug?season=` (kept for old links), `/person/:id/:slug`, `/search?q=`, `/browse/movie|tv?genre=&provider=&sort=`, `/calendar?kind=theaters|home|tv&month=YYYY-MM`, `/my-list?tab=watchlist|favorites`, `/privacy`, and `?ask=` on any URL for the AI assistant.

## AI assistant

- Backend: `services/assistant.py`, Claude Haiku 4.5 via the `anthropic` SDK, with a hand-written tool-calling loop. Tools wrap our own services (`discover`, `search_titles`, `similar_to`, `where_to_watch`), and `present_picks` gives the final answer.
- Invariants:
  - Only titles returned by a tool are accepted. If Claude answers in plain text, `present_picks` is forced with `tool_choice`.
  - `discover` returns only titles streaming (subscription) in the user's country, unless the user asks for new releases or theaters (`include_not_streaming`). The most popular titles are often still in theaters.
  - Tool input is validated with Pydantic before anything runs, since prompt injection could steer it.
- The model has no memory: the frontend resends a recap of up to 5 earlier turns (question and picked titles).
- Personalised for signed-in users: `/ask` reads the session cookie (`get_taste` in `api/v1/assistant.py`) and adds the newest saved titles (up to 15 per list) to the user message; the prompt says how to use them (taste, `similar_to` on favourites, never re-recommend saved titles, the request comes first). Personal answers are never cached. Anything failing there just means an anonymous answer.
- Cost is about 1-2 cents per question. Limits are in memory: 10/hour per IP and 300/day for the whole site. Answers are cached for 1 hour, first questions only. Tokens and cost are logged. Without `ANTHROPIC_API_KEY`, `/ask` returns 503.
- Frontend: `components/AssistantPanel.tsx`, a side panel (≥ sm) or bottom sheet on phones, open while the URL has `?ask`.
  - `lib/askPanel.ts`: a `?ask=question` link asks it on arrival.
  - `lib/chat.ts`: the conversation store, outside React, saved in `localStorage` with at most 20 turns.
  - `src/api/assistant.ts`: reads the SSE stream.
  - Entry points: navbar, `BottomNav`, `MoodRow` on the home page (a row of moods with backdrops, plus a field; it reuses `Row`), and the search box for queries of 3+ words.
  - AI styling: ✦ gradient icon and the thin `ai-ring` border (`ai-*` utilities).
- Evals (`backend/evals/`):
  - `cases.yaml`: about 27 requests with rules (some with a signed-in user's `taste`). The rules describe the kind of title, never exact titles, because TMDB changes daily.
  - `checks.py`: the rules, tested in `tests/test_evals_checks.py`.
  - `run.py`: runs the cases and records every tool call. Reports go to `evals/results/` (git-ignored).
  - `judge.py`: optional `--judge` using Claude Opus 5.
  - Usage: `python -m evals.run [--only id,id] [--repeat N] [--judge]`. In GitHub, the manual `evals.yml` workflow (needs the `ANTHROPIC_API_KEY` and `TMDB_API_KEY` secrets).
- `scripts/agent_playground.py`: the bare agent loop, for experiments.

## Security

- Never hardcode keys. A TMDB key was once committed (commit 9924824); treat it as compromised.
- Security headers (CSP...) are duplicated in `vercel.json` and `frontend/nginx.conf`. **Keep them identical.**
- The link-preview user-agent rule is also duplicated in `vercel.json` and `frontend/nginx.conf`. **Keep them identical.**
- Anything that spends money (Claude, OMDb) has limits and caching; keep it that way.
- `pages/PrivacyPage.tsx` is the privacy policy registered with Google for sign-in. Update it (and its date) whenever the data the app stores or sends changes.

## Commits and pull requests

- Work on `develop` (feature branches merged into it); PRs go from `develop` to `main`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`...). The CD workflow derives the version from them (`fix` → patch, `feat` → minor, `breaking` → major), so use them correctly.
- CI (`.github/workflows/ci.yml`, on PRs to `main` and `develop`): backend audit + ruff + pytest, frontend audit + lint + test + build, Docker build.
- `frontend/dist` is not committed.

## Deployment

- Vercel (Hobby), with Git integration: `main` deploys to production and other branches to previews. The CD workflow (`cd.yml`) only tags a semver version and creates a GitHub release; it does not deploy.
- `vercel.json` uses Services (beta): a `frontend` service (Vite, SPA fallback to `index.html`) and a `backend` service (FastAPI as a function, detected from `app/main.py`). `/api/*` goes to the backend.
- Secrets live in the Vercel project's environment variables. The rate limit is a Vercel Firewall rule (one per project on Hobby), configured in the dashboard.
- **There must be no `pyproject.toml` in `backend/`**: Vercel prefers it over `requirements.txt` and would deploy without FastAPI. That is why ruff and pytest are configured in `ruff.toml` and `pytest.ini`.
- `docker-compose.yml`: Postgres + backend (runs the migrations on start) + frontend (nginx on :3000, proxying `/api/` to the backend). Docker isn't available in the dev WSL, so the Dockerfiles are only validated by the CI `docker` job.

## Known issues

- The assistant's limits live in memory, per Vercel instance, so they are not exact.
- The domain `mymoviesapp.xyz` shows as parked on Afternic (probably expired): check the registrar or use another domain.

## Roadmap

- Phase 0 (done): backend rewritten with httpx, unified API, search, Docker, CI.
- Phase 1 (done): frontend rewrite and redesign, search with suggestions, tests. App name still open (proposal: "Marquee"). Next.js postponed; components and hooks are portable.
- Phase 2 (done): Postgres, Google sign-in (httpOnly cookie), favourites and "My list", live in production (Neon + Google).
- Phase 3 (in progress): natural-language "what to watch tonight" assistant and its evals (done). Recommendation rows from the user's lists and an assistant that knows the user's taste (done). Next: group mode, embeddings (pgvector).
- Phase 4 (almost done): deployed on Vercel, README with screenshots in `docs/screenshots/`. Missing: custom domain and, if needed, the Firewall rate-limit rule.
- Also done: directors/creators and crew credits, sagas, seasons and episodes, release calendar, link previews, browse by genre/service, country with flags, hover previews, trailers, awards and scores (OMDb), security review.
