import { afterEach, describe, expect, it, vi } from "vitest";

// The module reads whether index.html's splash exists when it loads, so each test loads it afresh.
async function loadWithSplash(present: boolean) {
  vi.resetModules();
  document.body.innerHTML = present ? '<div id="splash"></div>' : "";
  return import("./splash");
}

describe("splash holds", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("waits for every hold, then for the splash to go", async () => {
    const splash = await loadWithSplash(true);
    const releaseBanner = splash.holdSplash();
    const releasePoster = splash.holdSplash();
    const released = vi.fn();
    const gone = vi.fn();
    splash.whenSplashReleased(released);
    splash.whenSplashGone(gone);

    releaseBanner();
    releaseBanner(); // twice must not release the poster's hold
    expect(released).not.toHaveBeenCalled();
    releasePoster();
    expect(released).toHaveBeenCalledOnce();

    expect(gone).not.toHaveBeenCalled();
    splash.markSplashGone();
    expect(gone).toHaveBeenCalledOnce();
    expect(splash.isSplashUp()).toBe(false);
  });

  it("does nothing without a splash (in-app navigation, tests)", async () => {
    const splash = await loadWithSplash(false);
    expect(splash.isSplashUp()).toBe(false);
    splash.holdSplash();
    const released = vi.fn();
    const gone = vi.fn();
    splash.whenSplashReleased(released);
    splash.whenSplashGone(gone);
    expect(released).toHaveBeenCalledOnce();
    expect(gone).toHaveBeenCalledOnce();
  });
});
