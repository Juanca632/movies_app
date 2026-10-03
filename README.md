# 🎬 MoviesApp

A streaming-style explorer for movies, TV shows and people, built on the TMDB API: see what's trending, filter by genre and by the services you can actually watch in your country, open trailers, check awards and critic scores, ask an AI assistant what to watch tonight and, once signed in, get recommendations from your own favorites.

**Live demo → [movies-app-swart-xi.vercel.app](https://movies-app-swart-xi.vercel.app)**

![Home page with the featured movie and rows of posters](docs/screenshots/home.jpg)

## ✨ Features

- **Ask AI what to watch.** Describe a mood, a plot or a title you loved ("a short comedy on Netflix", "like Interstellar") and refine it in a chat ("more recent ones"). A Claude agent searches the catalog with the app's own API as tools, shows each step as it works, and only recommends real titles, each with why it fits and where to stream it in your country. It opens over any page from the navbar, the search box or the home page.
- **Recommendations from your taste.** Signed in, the home page adds three rows built from your favorites and your list:
  - **Picked for You by AI**: Claude reads your saved titles and picks eight it thinks you'd love, with a line on why. It runs on its own, without being asked, and is stored and reused: a new answer is only paid for when your lists change, at most once a day.
  - **Top Picks for You**: TMDB's recommendations for your recent saves, ranked so that titles recommended by several of them come first. No AI, no cost.
  - **Because You Liked…**: titles like one of your favorites, a different one on each visit.

  The assistant knows your taste too: "something for tonight" leans towards what you like, and it never suggests what you already saved.
- **My list and favorites (optional sign-in).** Sign in with Google to save titles to watch later and mark favorites, from any detail page or hover preview. Everything else works without an account.
- **Browse like a streaming service.** Home rows for what's in theaters, coming soon, popular and top rated; plus Movies and TV Shows pages filtered by genre, sorted by popularity, rating or release date, and shareable through the URL.
- **Where to watch, in your country.** The country is detected from the browser language (and can be changed with a flag picker). It drives the streaming, rent and buy options on each title, the "Streaming in…" filter (e.g. *comedies on Netflix in Colombia*) and local release dates. The logos of the main services (Netflix, Prime Video, Apple TV, Google Play, YouTube…) open a search for the title on that service.
- **Hover previews.** Resting the mouse on a poster grows it into a card with the backdrop, rating, runtime, genres, synopsis and a trailer button (pointer devices only).
- **Seasons and episodes** for every show, starting from the latest season on air, plus the next scheduled episode.
- **Directors, creators and sagas**: who made each title, directors' and writers' filmographies, and every movie of a saga in release order.
- **Release calendar**: what opens in theaters or at home each month in your country, and new series premiering.
- **Trailers** in a modal player, from the home spotlight, the previews and every detail page.
- **Awards and critic scores**: IMDb, Rotten Tomatoes and Metacritic, plus the awards summary ("Won 4 Oscars…").
- **Live search** across movies, TV shows and people, with suggestions and keyboard navigation.
- **Link previews**: sharing a movie, show or person on WhatsApp, Telegram, Discord… shows a card with its image, title and synopsis.
- **Mobile first**: collapsible search, touch-friendly dropdowns, no horizontal overflow.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/for-you.jpg" alt="AI picks and top picks from the user's favorites"><br><sub>Picked for you by AI, from your favorites</sub></td>
    <td width="50%"><img src="docs/screenshots/assistant.jpg" alt="The AI assistant answering a request for a short comedy on Netflix"><br><sub>Ask AI: each pick with why and where to stream it</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/detail.jpg" alt="Inception detail page with scores, awards and where to watch"><br><sub>Detail page: scores, awards and where to watch</sub></td>
    <td width="50%"><img src="docs/screenshots/hover-preview.jpg" alt="Hover preview card over a poster"><br><sub>Hover preview</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/browse.jpg" alt="Comedy movies on Netflix in the United States"><br><sub>Browse: comedies streaming on Netflix</sub></td>
    <td width="50%"><img src="docs/screenshots/my-list.jpg" alt="The user's favorites"><br><sub>My list and favorites</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <img src="docs/screenshots/mobile-home.jpg" alt="Home page on a phone" width="24%">
      <img src="docs/screenshots/mobile-detail.jpg" alt="Breaking Bad on a phone" width="24%"><br><sub>Mobile</sub>
    </td>
  </tr>
</table>

## 🛠️ Tech stack

| | |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, TanStack Query, React Router 7 |
| **Backend** | Python 3.12, FastAPI, httpx (async client with retries and a TTL cache), pydantic-settings |
| **Accounts** | Google sign-in (OAuth code flow with PKCE, run by the backend), httpOnly session cookie, Postgres on [Neon](https://neon.tech) with SQLAlchemy 2 (async) and Alembic |
| **Data** | [TMDB](https://www.themoviedb.org/) (titles, people, images, trailers; streaming data by JustWatch) and [OMDb](https://www.omdbapi.com/) (awards and critic scores) |
| **AI** | Claude Haiku 4.5 through the Anthropic Python SDK: a hand-written tool-calling loop, answers streamed as Server-Sent Events |
| **Testing** | Vitest + Testing Library, pytest + respx (no network in tests) |
| **Hosting** | Vercel (static frontend + FastAPI function in one project) |
| **Tooling** | GitHub Actions (lint, tests, dependency audit, Docker build), semantic-versioned releases; Docker + nginx for local production-like runs |

## 🏗️ Architecture

```mermaid
flowchart LR
  B[Browser] -->|"/*"| F["Frontend<br/>React SPA (static)"]
  B -->|"/api/v1/*"| A["Backend<br/>FastAPI"]
  A -->|cached| T[(TMDB API)]
  A -->|cached, optional| O[(OMDb API)]
  A -->|"tool calling, optional"| C[(Claude API)]
  A -->|"accounts, optional"| D[(Postgres)]
  A -->|"sign-in, optional"| G[(Google OAuth)]
```

The browser only talks to this app: the frontend and the API share one domain, and the API keys never leave the backend. The backend normalises TMDB's movie/TV differences into one API and caches responses in memory. The same layout runs on Vercel (`vercel.json`) and locally with Docker (`docker-compose.yml`, nginx in front).

The AI assistant is an agent loop in the backend (`backend/app/services/assistant.py`): Claude gets the request plus tools that wrap the backend's own TMDB services (discover with filters, search, similar titles, where to watch), calls them as needed and finishes with a structured list of picks, which the backend only accepts if a tool returned them. Follow-ups resend a compact recap of the conversation, since the model has no memory. For a signed-in user the backend also adds their newest saved titles to the request, so answers lean towards their taste. Its cost is kept in check with per-visitor and site-wide limits, a cache for repeated (anonymous) questions and a small, fast model.

The AI picks on the home page reuse the same agent with a fixed request (`backend/app/services/ai_picks.py`). Since nobody is waiting to pay for each one, the answer is stored per user with a fingerprint of their lists and country, and only remade when that changed and it is over a day old; reloading the page costs nothing.

Security basics are in place on both: a Content Security Policy and related headers, per-IP rate limiting on the API, validated inputs, sessions in an httpOnly cookie (only a hash of the token is stored), same-origin checks on writes and no secrets in the client or in the repo.

## 🚀 Running locally

**Requirements:** Python 3.12, Node 22, a free [TMDB API key](https://www.themoviedb.org/settings/api) and, optionally, a free [OMDb API key](https://www.omdbapi.com/apikey.aspx) and an [Anthropic API key](https://platform.claude.com) (pay as you go) for the AI assistant.

1. Create `backend/.env`:

   | Variable | Required | Purpose |
   |---|---|---|
   | `THE_MOVIE_DB_API_KEY` | yes | TMDB API key |
   | `OMDB_API_KEY` | no | Awards and critic scores; hidden without it |
   | `ANTHROPIC_API_KEY` | no | The "Ask AI" assistant; without it `/api/v1/ask` answers 503. Each question costs about 1–2 cents |
   | `DATABASE_URL` | no | Postgres for accounts (e.g. a free [Neon](https://neon.tech) database); `sqlite+aiosqlite:///dev.db` works for local tries. Run `alembic upgrade head` in `backend/` after setting it |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | Google sign-in (an OAuth "Web application" client with `http://localhost:5173/api/v1/auth/google/callback` as redirect URI) |
   | `SESSION_SECRET` | no | Any long random string (`python -c "import secrets; print(secrets.token_urlsafe(32))"`). Sign-in appears only with the database and these three |
   | `CORS_ORIGINS` | no | Frontend origins allowed to call the API; the default covers `npm run dev` (:5173) and Docker (:3000) |

2. Start the backend (http://localhost:8000, docs at `/docs`):

   ```bash
   cd backend
   python -m venv myvenv && source myvenv/bin/activate
   pip install -r requirements-dev.txt
   uvicorn app.main:app --reload
   ```

3. Start the frontend (http://localhost:5173):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

`./start.sh` runs both. To try the production setup instead, run `docker compose up --build` and open http://localhost:3000.

## ✅ Tests and checks

```bash
# backend/
ruff check . && pytest -q

# frontend/
npm run lint && npm test && npm run build
```

Every pull request runs all of the above plus a dependency audit and a Docker build.

### Evals for the AI assistant

Unit tests use a fake Claude, so they check the code, not the quality of the recommendations. For that there are evals: about 30 real requests (by genre, by streaming service, "something like X", in Spanish, off-topic, prompt injection, a follow-up, a signed-in user's taste, the home page's AI picks...) sent to the real Claude and TMDB, each scored against rules that describe a good answer, never exact titles, since catalogs change: *every pick is a horror movie, streams on Netflix, isn't the title it was compared to*. An optional LLM judge (`--judge`) scores what rules can't, like whether the reasons fit the request.

```bash
# backend/, with ANTHROPIC_API_KEY in .env (~$0.20 per run, more with --judge)
python -m evals.run                          # all cases, prints a table and the pass rate
python -m evals.run --only horror-netflix --repeat 3
```

They run on demand after changing the prompt, the tools or the model (locally, or from the "Assistant evals" workflow in GitHub Actions), not on every pull request. Cases live in `backend/evals/cases.yaml`.

## 📦 Deployment

Vercel deploys `main` to production and every other branch to a private preview. The project needs `THE_MOVIE_DB_API_KEY` (and optionally `OMDB_API_KEY`, `ANTHROPIC_API_KEY` and, for accounts, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` and `PUBLIC_URL`) as environment variables. Database migrations are run by hand (`alembic upgrade head` against the production database) before deploying a change that needs them. It also needs one Firewall rate-limit rule for `/api/`. Merging into `main` also tags a semantic version and publishes a GitHub release.

## 🗺️ Roadmap

- **Group mode:** one recommendation for several people's tastes.
- **Finer recommendations:** 👍/👎 on picks, and similar titles by embeddings (pgvector).

## 🙏 Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability is provided by JustWatch through TMDB, awards and scores come from OMDb, and the assistant's suggestions are generated by Claude and can be wrong. Posters, backdrops and trailers belong to their respective owners.

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB logo" width="140">
