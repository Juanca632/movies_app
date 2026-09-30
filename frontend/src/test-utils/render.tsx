import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";
import { createQueryClient } from "../api/queries";
import { routes } from "../router";

type Handler = unknown | ((init?: RequestInit) => Response);

/**
 * Stub `fetch` with canned backend responses keyed by path + query (e.g. "movie/1"), for any
 * method. A value is returned as JSON; a function gets the request's init (method...) and can
 * build any Response. Unknown paths 404.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const key = `${url.pathname.replace(/^\/api\/v1\//, "")}${url.search}`;
    if (!(key in handlers)) return new Response("Not found", { status: 404 });
    const handler = handlers[key];
    return typeof handler === "function" ? (handler as (init?: RequestInit) => Response)(init) : Response.json(handler);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Render the real route tree at `path`, with a fresh cache and no retries. */
export function renderRoute(path: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
