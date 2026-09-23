import { useSyncExternalStore } from "react";
import type { MediaType } from "../api/types";

// Which title's trailer is playing. It lives outside any card so the player survives
// the hover preview that opened it closing underneath.
export interface TrailerRequest {
  mediaType: MediaType;
  id: number;
  title: string;
}

let current: TrailerRequest | null = null;
const listeners = new Set<() => void>();

const emit = (next: TrailerRequest | null) => {
  current = next;
  listeners.forEach((listener) => listener());
};

export const openTrailer = (request: TrailerRequest) => emit(request);
export const closeTrailer = () => emit(null);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTrailerRequest = () => useSyncExternalStore(subscribe, () => current);
