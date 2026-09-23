# 🎬 MyMoviesApp

A streaming-style explorer for movies, TV shows and people, built on the TMDB API: see what's trending, filter by genre and by the services you can actually watch in your country, open trailers, and check awards and critic scores.

**Live demo → [movies-app-swart-xi.vercel.app](https://movies-app-swart-xi.vercel.app)**

![Home page with the featured movie and rows of posters](docs/screenshots/home.jpg)

## ✨ Features

- **Browse like a streaming service.** Home rows for what's in theaters, coming soon, popular and top rated; plus Movies and TV Shows pages filtered by genre, sorted by popularity, rating or release date, and shareable through the URL.
- **Where to watch, in your country.** The country is detected from the browser language (and can be changed with a flag picker). It drives the streaming, rent and buy options on each title, the "Streaming in…" filter (e.g. *comedies on Netflix in Colombia*) and local release dates. The logos of the main services (Netflix, Prime Video, Apple TV, Google Play, YouTube…) open a search for the title on that service.
- **Hover previews.** Resting the mouse on a poster grows it into a card with the backdrop, rating, runtime, genres, synopsis and a trailer button (pointer devices only).
- **Trailers** in a modal player, from the home spotlight, the previews and every detail page.
- **Awards and critic scores**: IMDb, Rotten Tomatoes and Metacritic, plus the awards summary ("Won 4 Oscars…").
- **Live search** across movies, TV shows and people, with suggestions and keyboard navigation.
- **Mobile first**: collapsible search, touch-friendly dropdowns, no horizontal overflow.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/hover-preview.jpg" alt="Hover preview card over a poster"><br><sub>Hover preview</sub></td>
    <td width="50%"><img src="docs/screenshots/detail.jpg" alt="Inception detail page with scores, awards and where to watch"><br><sub>Detail page: scores, awards and where to watch</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/browse.jpg" alt="Comedy movies on Netflix in the United States"><br><sub>Browse: comedies streaming on Netflix</sub></td>
    <td width="50%">
      <img src="docs/screenshots/mobile-home.jpg" alt="Home page on a phone" width="48%">
      <img src="docs/screenshots/mobile-detail.jpg" alt="Breaking Bad on a phone" width="48%"><br><sub>Mobile</sub>
    </td>
  </tr>
</table>

## 🛠️ Tech stack

| | |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, TanStack Query, React Router 7 |
| **Backend** | Python 3.12, FastAPI, httpx (async client with retries and a TTL cache), pydantic-settings |
| **Data** | [TMDB](https://www.themoviedb.org/) (titles, people, images, trailers; streaming data by JustWatch) and [OMDb](https://www.omdbapi.com/) (awards and critic scores) |
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
```

The browser only talks to this app: the frontend and the API share one domain, and the API keys never leave the backend. The backend normalises TMDB's movie/TV differences into one API and caches responses in memory. The same layout runs on Vercel (`vercel.json`) and locally with Docker (`docker-compose.yml`, nginx in front).

Security basics are in place on both: a Content Security Policy and related headers, per-IP rate limiting on the API, validated inputs and no secrets in the client or in the repo.

## 🚀 Running locally

**Requirements:** Python 3.12, Node 22, a free [TMDB API key](https://www.themoviedb.org/settings/api) and, optionally, a free [OMDb API key](https://www.omdbapi.com/apikey.aspx).

1. Create `backend/.env`:

   | Variable | Required | Purpose |
   |---|---|---|
   | `THE_MOVIE_DB_API_KEY` | yes | TMDB API key |
   | `OMDB_API_KEY` | no | Awards and critic scores; hidden without it |
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

## 📦 Deployment

Vercel deploys `main` to production and every other branch to a private preview. The project needs `THE_MOVIE_DB_API_KEY` (and optionally `OMDB_API_KEY`) as environment variables, plus one Firewall rate-limit rule for `/api/`. Merging into `main` also tags a semantic version and publishes a GitHub release.

## 🗺️ Roadmap

- **Accounts (optional):** sign in with Google to keep favourites and "My list" across devices.
- **AI recommendations** based on what you like.

## 🙏 Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability is provided by JustWatch through TMDB, and awards and scores come from OMDb. Posters, backdrops and trailers belong to their respective owners.

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB logo" width="140">
