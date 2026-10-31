import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { hashKey } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { API_URL } from "./api/client";
import { createQueryClient, mediaListKey, persistOptions } from "./api/queries";
import type { MediaSummary, Page } from "./api/types";
import WakeNotice from "./components/WakeNotice";
import "./index.css";
import { registerServiceWorker, reloadOnStaleChunks } from "./lib/serviceWorker";
import { markSplashGone, whenPageRendered, whenSplashGone, whenSplashReleased } from "./lib/splash";
import { imageUrl } from "./lib/tmdb";
import { createRouter } from "./router";

// Picks up the ping index.html preloads to wake the backend (a fetch nobody reads is a warning).
fetch(`${API_URL}/health`).catch(() => {});

const queryClient = createQueryClient();
const router = createRouter();

/** localStorage throws in some private modes; then the app just starts without the last visit. */
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
const PERSIST_KEY = "moviesapp-cache";
const persister = createSyncStoragePersister({ storage: browserStorage(), key: PERSIST_KEY });

/**
 * A returning visitor's home banner is known before React renders: it's the first backdrop of the
 * saved popular list (Hero keeps those slides for the visit). Fetching it now, in parallel with the
 * page's code, means the splash usually reveals it already loaded.
 */
function preloadSavedBanner() {
  if (location.pathname !== "/") return;
  try {
    const saved = JSON.parse(browserStorage()?.getItem(PERSIST_KEY) ?? "null");
    if (saved?.buster !== persistOptions.buster || Date.now() - saved.timestamp > persistOptions.maxAge) return;
    const hash = hashKey(mediaListKey("movie", "popular", null));
    const query = saved.clientState?.queries?.find((saved: { queryHash: string }) => saved.queryHash === hash);
    const page: Page<MediaSummary> | undefined = query?.state?.data;
    const href = imageUrl(page?.results?.find((movie) => movie.backdrop_path)?.backdrop_path, "w1280");
    if (!href) return;
    const link = Object.assign(document.createElement("link"), { rel: "preload", as: "image", href });
    link.setAttribute("fetchpriority", "high");
    document.head.append(link);
  } catch {
    // A corrupt or old save: the banner just loads when the page renders.
  }
}
preloadSavedBanner();

/** A cold backend takes seconds; past this the page shows its skeletons and WakeNotice instead. */
const SPLASH_MAX_MS = 8000;
/** Once there is data, how long the images on screen may keep the splash up. */
const IMAGE_WAIT_MS = 2500;
/** Matches the splash's opacity transition in index.html. */
const SPLASH_FADE_MS = 400;

/**
 * index.html paints a splash before any script runs. It stays until the page has data to show
 * (the backend may be waking up) and the images on screen are decoded (lib/splash.ts), so
 * visitors see a normal launch instead of empty skeletons or images popping in.
 */
function hideSplash() {
  const splash = document.getElementById("splash");
  markSplashGone();
  if (!splash) return;
  // One frame first, so the page under it is painted once before it shows through.
  requestAnimationFrame(() => {
    splash.style.opacity = "0";
    splash.style.pointerEvents = "none";
    setTimeout(() => splash.remove(), SPLASH_FADE_MS);
  });
}

/** Queries of the app's frame rather than the page (the account, the navbar's country list). */
const FRAME_QUERIES: unknown[] = ["me", "regions"];

/** The page's queries. */
function pageQueries() {
  return queryClient
    .getQueryCache()
    .findAll({ type: "active" })
    .filter((query) => !FRAME_QUERIES.includes(query.queryKey[0]));
}

function hideSplashOnContent() {
  const cache = queryClient.getQueryCache();
  let unsubscribe = () => {};
  let imageTimer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    unsubscribe();
    clearTimeout(timer);
    clearTimeout(imageTimer);
    hideSplash();
  };
  const timer = setTimeout(done, SPLASH_MAX_MS);
  // With data, wait for the images on screen. Two frames first, so React has committed what the
  // data produced and those images hold the splash before we look.
  let waiting = false;
  const dataReady = () => {
    if (waiting) return;
    waiting = true;
    unsubscribe();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        imageTimer = setTimeout(done, IMAGE_WAIT_MS);
        whenSplashReleased(done);
      }),
    );
  };
  // Restored data from the last visit counts, and so does an error (the page shows its own message).
  const check = () => {
    if (pageQueries().some((query) => query.state.status !== "pending")) dataReady();
  };
  unsubscribe = cache.subscribe(check);
  // Saved data is restored asynchronously, and queries only count once they subscribe after it:
  // give that two frames. A page without queries (privacy) then shows at once.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (pageQueries().length === 0) dataReady();
      else check();
    }),
  );
}

// Waits for the first page to render, not just its code: React may take a while on a slow phone.
whenPageRendered(hideSplashOnContent);

reloadOnStaleChunks();
// Dev builds have no sw.js; a service worker there would only get in the way of hot reload.
// After the splash: its first-visit precache would compete with the images the splash waits for.
if (import.meta.env.PROD) whenSplashGone(() => registerServiceWorker(router));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, ...persistOptions }}>
      <RouterProvider router={router} />
      <WakeNotice />
      <Analytics />
    </PersistQueryClientProvider>
  </StrictMode>,
);
