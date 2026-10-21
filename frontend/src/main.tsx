import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
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

/** index.html paints a splash before any script runs; it fades out once the first page is ready. */
function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 300);
}
if (router.state.initialized) hideSplash();
else {
  const unsubscribe = router.subscribe((state) => {
    if (!state.initialized) return;
    unsubscribe();
    hideSplash();
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
    </PersistQueryClientProvider>
  </StrictMode>,
);
