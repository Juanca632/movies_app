const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

// VITE_API_URL wins; otherwise talk to the local backend in dev and to the reverse proxy in prod.
export const API_URL: string =
  import.meta.env.VITE_API_URL ??
  (isLocal ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1` : "/api/v1");

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

/** True when the backend says the thing does not exist (unknown or malformed id). */
export const isNotFound = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 422);
