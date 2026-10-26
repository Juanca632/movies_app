import { useSyncExternalStore } from "react";

/**
 * The welcome tour: shown once, on a first visit, and again from the footer's "How it works".
 * Only "already seen" is saved (in localStorage); without storage it shows on every visit, which
 * beats never showing it.
 */
const STORAGE_KEY = "moviesapp-welcome-seen";

let open = false;
const listeners = new Set<() => void>();

function setOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useWelcomeOpen = () => useSyncExternalStore(subscribe, () => open);

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Open the tour, and remember it was seen (closing the tab mid-tour counts too). */
export function showWelcome() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode: it will show again next time.
  }
  setOpen(true);
}

export const closeWelcome = () => setOpen(false);

/** Run `callback` once index.html's splash is gone, so the tour isn't opened behind it. */
export function whenSplashGone(callback: () => void) {
  const splash = document.getElementById("splash");
  if (!splash) {
    callback();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (splash.isConnected) return;
    observer.disconnect();
    callback();
  });
  observer.observe(splash.parentNode ?? document.body, { childList: true });
  return () => observer.disconnect();
}
