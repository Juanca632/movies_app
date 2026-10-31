import { afterEach, describe, expect, it } from "vitest";
import { lockScroll } from "./scrollLock";

describe("lockScroll", () => {
  afterEach(() => {
    document.documentElement.style.overflow = "";
  });

  it("locks <html> until the last overlay releases it", () => {
    const root = document.documentElement;
    const releaseTour = lockScroll();
    const releaseAssistant = lockScroll();
    expect(root.style.overflow).toBe("hidden");

    releaseTour();
    releaseTour(); // a second call must not release the assistant's lock
    expect(root.style.overflow).toBe("hidden");

    releaseAssistant();
    expect(root.style.overflow).toBe("");
  });
});
