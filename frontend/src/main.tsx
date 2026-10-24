import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { API_URL } from "./api/client";
import { createQueryClient, persistOptions } from "./api/queries";
import WakeNotice from "./components/WakeNotice";
import "./index.css";
import { registerServiceWorker, reloadOnStaleChunks } from "./lib/serviceWorker";
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
const persister = createSyncStoragePersister({ storage: browserStorage(), key: "moviesapp-cache" });

/** A cold backend takes seconds; past this the page shows its skeletons and WakeNotice instead. */
const SPLASH_MAX_MS = 8000;

/**
 * index.html paints a splash before any script runs. It stays until the page has data to show
 * (the backend may be waking up), so visitors see a normal launch instead of empty skeletons.
 */
function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 300);
}

/** The page's queries, without the account's (it shows no skeleton). */
function pageQueries() {
  return queryClient
    .getQueryCache()
    .findAll({ type: "active" })
    .filter((query) => query.queryKey[0] !== "me");
}

function hideSplashOnContent() {
  const cache = queryClient.getQueryCache();
  let unsubscribe = () => {};
  const done = () => {
    unsubscribe();
    clearTimeout(timer);
    hideSplash();
  };
  const timer = setTimeout(done, SPLASH_MAX_MS);
  // Restored data from the last visit counts, and so does an error (the page shows its own message).
  const check = () => {
    if (pageQueries().some((query) => query.state.status !== "pending")) done();
  };
  unsubscribe = cache.subscribe(check);
  // Give the page a moment to mount its queries; a page without any (privacy) shows at once.
  setTimeout(() => {
    if (pageQueries().length === 0) done();
    else check();
  }, 100);
}

if (router.state.initialized) hideSplashOnContent();
else {
  const unsubscribe = router.subscribe((state) => {
    if (!state.initialized) return;
    unsubscribe();
    hideSplashOnContent();
  });
}

reloadOnStaleChunks();
// Dev builds have no sw.js; a service worker there would only get in the way of hot reload.
if (import.meta.env.PROD) registerServiceWorker(router);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, ...persistOptions }}>
      <RouterProvider router={router} />
      <WakeNotice />
      <Analytics />
    </PersistQueryClientProvider>
  </StrictMode>,
);
