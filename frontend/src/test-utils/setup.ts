import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// jsdom does not implement scrolling.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollBy = vi.fn();

// react-router builds a native Request with jsdom's AbortSignal, which Node's Request rejects.
// No route here has loaders, so the signal can be dropped in tests.
class TestRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init && { ...init, signal: undefined });
  }
}
globalThis.Request = TestRequest;
