import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * The splash index.html paints before any script runs. main.tsx removes it once the page has data
 * and the images on screen are ready, so it reveals a finished page instead of images popping in.
 * Components showing an image above the fold hold it (`useSplashHold`) until that image is
 * decoded. Once the splash is gone everything here is a no-op, so in-app navigation never waits.
 */
let up = typeof document !== "undefined" && document.getElementById("splash") !== null;
const holds = new Set<symbol>();
const releasedListeners = new Set<() => void>();
const goneListeners = new Set<() => void>();

export const isSplashUp = () => up;

let pageRendered = false;
const renderedListeners = new Set<() => void>();

/** Layout calls this once the first page has rendered (its queries and holds now exist). */
export function markPageRendered() {
  if (pageRendered) return;
  pageRendered = true;
  const listeners = [...renderedListeners];
  renderedListeners.clear();
  listeners.forEach((listener) => listener());
}

/** Run `callback` once the first page has rendered. */
export function whenPageRendered(callback: () => void) {
  if (pageRendered) callback();
  else renderedListeners.add(callback);
}

/** Keep the splash up until the returned function is called. */
export function holdSplash(): () => void {
  if (!up) return () => {};
  const token = Symbol();
  holds.add(token);
  return () => {
    if (!holds.delete(token) || holds.size > 0) return;
    const listeners = [...releasedListeners];
    releasedListeners.clear();
    listeners.forEach((listener) => listener());
  };
}

/** Run `callback` once nothing holds the splash (right away if nothing does). */
export function whenSplashReleased(callback: () => void) {
  if (holds.size === 0) callback();
  else releasedListeners.add(callback);
}

/** Run `callback` once the splash has started leaving (right away if there is none). */
export function whenSplashGone(callback: () => void) {
  if (!up) {
    callback();
    return () => {};
  }
  goneListeners.add(callback);
  return () => {
    goneListeners.delete(callback);
  };
}

/** Called by main.tsx as the splash starts fading out. */
export function markSplashGone() {
  if (!up) return;
  up = false;
  holds.clear();
  releasedListeners.clear();
  const listeners = [...goneListeners];
  goneListeners.clear();
  listeners.forEach((listener) => listener());
}

/**
 * Hold the splash from mount until `ready`. The hold is taken in a layout effect: React Query's
 * subscriptions are passive effects, and the first data arriving is what makes main.tsx look at
 * the holds, so they must already exist by then.
 */
export function useSplashHold(ready: boolean, enabled = true) {
  const release = useRef<() => void>(undefined);
  useLayoutEffect(() => {
    if (!enabled) return;
    release.current = holdSplash();
    return () => release.current?.();
  }, [enabled]);
  useEffect(() => {
    if (ready) release.current?.();
  }, [ready]);
}
