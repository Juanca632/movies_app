// Same origin everywhere (Vite's dev proxy, nginx and Vercel all forward /api), so the session
// cookie and Google's redirect behave in dev as in production. VITE_API_URL overrides it.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";

const TIMEOUT_MS = 10_000;

/** AbortSignal.any, with a fallback for browsers that lack it (Safari before 17.4). */
export function anySignal(signals: AbortSignal[]): AbortSignal {
  if ("any" in AbortSignal) return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** GET a JSON endpoint of the backend. `signal` lets React Query cancel stale requests. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(`${API_URL}/${path}`, {
    signal: signal ? anySignal([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/** PUT/POST/DELETE to the backend; resolves to the JSON body, or null for 204 No Content. */
export async function sendJson<T>(method: "PUT" | "POST" | "DELETE", path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}/${path}`, { method, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new ApiError(response.status, `${method} ${path} failed with ${response.status}`);
  }
  return response.status === 204 ? null : (response.json() as Promise<T>);
}

/** True when the backend says the thing does not exist (unknown or malformed id). */
export const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 422);
