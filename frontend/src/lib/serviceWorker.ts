import type { Location } from "react-router-dom";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const RELOAD_GUARD_KEY = "moviesapp.chunkReload";

const reloadPage = () => window.location.reload();

interface RouterLike {
  subscribe(fn: (state: { location: Location }) => void): () => void;
}

/**
 * Installs the service worker (vite-plugin-pwa builds /sw.js) and keeps the app on the latest deploy.
 *
 * A deploy changes sw.js, which activates straight away (skipWaiting + clientsClaim). The page
 * already running keeps its old code, so the next in-app navigation becomes a full page load; that
 * is a moment the user expects the screen to change, unlike a reload out of nowhere.
 */
export function registerServiceWorker(router: RouterLike, reload = reloadPage) {
  if (!("serviceWorker" in navigator)) return;
  const container = navigator.serviceWorker;

  let controlled = container.controller !== null;
  let updated = false;
  container.addEventListener("controllerchange", () => {
    // The first install also takes control; only a replacement means new code.
    if (controlled) updated = true;
    controlled = true;
  });

  let path = window.location.pathname;
  router.subscribe(({ location }) => {
    if (location.pathname === path) return;
    path = location.pathname;
    if (updated) reload();
  });

  const register = () => {
    container
      .register("/sw.js")
      .then((registration) => {
        // Installed apps can sit in the background for days: look for a deploy when they come back.
        const check = () => {
          if (registration.installing || !navigator.onLine) return;
          registration.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        setInterval(check, UPDATE_INTERVAL_MS);
      })
      .catch(() => {});
  };
  // main.tsx calls this once the splash is gone, usually after the load event.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}

/**
 * A tab opened before a deploy asks for page chunks that no longer exist. Reloading picks up the
 * new index.html; the guard avoids a loop if the chunk is missing for another reason.
 */
export function reloadOnStaleChunks(reload = reloadPage) {
  window.addEventListener("vite:preloadError", (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    } catch {
      return;
    }
    if (Date.now() - last < 10_000) return;
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    reload();
  });
}
