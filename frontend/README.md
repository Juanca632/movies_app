# MyMoviesApp — frontend

React 19 + TypeScript + Vite, styled with Tailwind 4. Talks only to the FastAPI backend (`/api/v1`), never to TMDB directly.

## Scripts

```bash
npm run dev      # dev server (expects the backend on :8000)
npm test         # Vitest + Testing Library
npm run lint
npm run build    # typecheck + production bundle
```

Set `VITE_API_URL` at build time to point to another backend; by default it uses `http://localhost:8000/api/v1` locally and `/api/v1` (reverse proxy) elsewhere.

## Layout

```
src/
  api/         client (fetch + ApiError), React Query hooks, response types
  lib/         TMDB helpers (image urls, links, formatting), document title hook
  components/  presentational pieces: cards, rows, hero, detail header, navbar/layout
  pages/       one component per route; data fetching lives here, rendering in *DetailView
  router.tsx   route tree (lazy pages, 404, scroll restoration)
  test-utils/  Vitest setup, fixtures and a helper that renders a route with a mocked API
```

Design tokens (colors, fonts, animations) live in `src/index.css` under `@theme`.
