import { useSyncExternalStore } from "react";

// The user's country decides where things can be streamed and what is in theaters.
const STORAGE_KEY = "region";
const FALLBACK = "US";
const CODE = /^[A-Z]{2}$/;

/** Country from the browser languages: "es-CO" -> "CO", a bare "es" -> its likely country "ES". */
export function detectRegion(languages: readonly string[] = navigator.languages ?? []): string {
  const locales = languages.flatMap((tag) => {
    try {
      return [new Intl.Locale(tag)];
    } catch {
      return [];
    }
  });
  // An explicit country in any language beats a guessed one ("en" alone guesses US).
  const explicit = locales.map((locale) => locale.region).find((region) => region && CODE.test(region));
  const guessed = locales.map((locale) => locale.maximize().region).find((region) => region && CODE.test(region));
  return explicit ?? guessed ?? FALLBACK;
}

function readStored(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && CODE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

let current = readStored() ?? detectRegion();
const listeners = new Set<() => void>();

export function setRegion(code: string) {
  if (!CODE.test(code) || code === current) return;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode or blocked storage: the choice still lasts for this visit.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRegion = () => useSyncExternalStore(subscribe, () => current);
