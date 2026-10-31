import type { Location } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerServiceWorker, reloadOnStaleChunks } from "./serviceWorker";

class FakeContainer extends EventTarget {
  controller: object | null;
  register = vi.fn(() => new Promise<never>(() => {}));
  constructor(controlled: boolean) {
    super();
    this.controller = controlled ? {} : null;
  }
}

function setup({ controlled }: { controlled: boolean }) {
  const container = new FakeContainer(controlled);
  vi.stubGlobal("navigator", { ...navigator, serviceWorker: container });
  let listener: (state: { location: Location }) => void = () => {};
  const router = {
    subscribe: (fn: typeof listener) => {
      listener = fn;
      return () => {};
    },
  };
  const reload = vi.fn();
  registerServiceWorker(router, reload);
  const navigate = (pathname: string) =>
    listener({ location: { pathname, search: "", hash: "", state: null, key: pathname } });
  return { container, navigate, reload };
}

describe("registerServiceWorker", () => {
  it("turns the next navigation into a page load once a new version took over", () => {
    const { container, navigate, reload } = setup({ controlled: true });

    navigate("/calendar");
    expect(reload).not.toHaveBeenCalled();

    container.dispatchEvent(new Event("controllerchange"));
    navigate("/calendar"); // Same page (e.g. only the query changed): no reload.
    expect(reload).not.toHaveBeenCalled();
    navigate("/my-list");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload when the first install takes control", () => {
    const { container, navigate, reload } = setup({ controlled: false });

    container.dispatchEvent(new Event("controllerchange"));
    navigate("/calendar");
    expect(reload).not.toHaveBeenCalled();

    // A later deploy, in the same visit, does count.
    container.dispatchEvent(new Event("controllerchange"));
    navigate("/my-list");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("registers the service worker after the page loads", () => {
    const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("interactive");
    const { container } = setup({ controlled: false });
    expect(container.register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    expect(container.register).toHaveBeenCalledWith("/sw.js");
    readyState.mockRestore();
  });

  it("registers it at once when the page has already loaded (after the splash)", () => {
    const { container } = setup({ controlled: false });
    expect(container.register).toHaveBeenCalledWith("/sw.js");
  });
});

describe("reloadOnStaleChunks", () => {
  afterEach(() => sessionStorage.clear());

  it("reloads once when a page chunk fails to load", () => {
    const reload = vi.fn();
    reloadOnStaleChunks(reload);

    const first = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(first);
    expect(reload).toHaveBeenCalledOnce();
    expect(first.defaultPrevented).toBe(true);

    // Failing again right after the reload: let the error page show instead of looping.
    const second = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(second);
    expect(reload).toHaveBeenCalledOnce();
    expect(second.defaultPrevented).toBe(false);
  });
});
