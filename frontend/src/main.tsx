import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createQueryClient } from "./api/queries";
import "./index.css";
import { registerServiceWorker, reloadOnStaleChunks } from "./lib/serviceWorker";
import { createRouter } from "./router";

const queryClient = createQueryClient();
const router = createRouter();

reloadOnStaleChunks();
// Dev builds have no sw.js; a service worker there would only get in the way of hot reload.
if (import.meta.env.PROD) registerServiceWorker(router);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
