import { useSyncExternalStore } from "react";
import { askAssistant, type HistoryTurn } from "../api/assistant";
import { ApiError } from "../api/client";
import type { AssistantAnswer, AssistantEvent } from "../api/types";

/** One question to the AI assistant and how its answer is going. */
export interface ChatTurn {
  id: string;
  question: string;
  steps: string[];
  answer: AssistantAnswer | null;
  error: string | null;
  pending: boolean;
}

const STORAGE_KEY = "assistant-chat-v1";
/** Earlier turns resent with a follow-up (the backend takes up to 5). */
const HISTORY_TURNS = 5;
/** After this many questions a new chat has to be started, to keep every request small. */
export const MAX_TURNS = 20;

/*
 * The conversation lives here, outside React, so it survives closing the panel (a request on its
 * way keeps going) and is saved in localStorage so it survives reloads. With accounts (phase 2)
 * this would move to the database.
 */
let turns: ChatTurn[] | null = null;
const listeners = new Set<() => void>();
const requests = new Map<string, AbortController>();

function load(): ChatTurn[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? (saved as ChatTurn[]) : [];
  } catch {
    return []; // private mode, blocked storage or a corrupted value: start empty
  }
}

const current = () => (turns ??= load());

function save(next: ChatTurn[]) {
  turns = next;
  try {
    // Unfinished turns aren't kept: after a reload nothing would complete them.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((turn) => !turn.pending)));
  } catch {
    // Storage full or blocked: the chat still works, it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

const update = (id: string, change: (turn: ChatTurn) => ChatTurn) => save(current().map((turn) => (turn.id === id ? change(turn) : turn)));

/** The recap sent with a follow-up: earlier questions and the titles they got, nothing more. */
const recap = (earlier: ChatTurn[]): HistoryTurn[] =>
  earlier
    .filter((turn) => turn.answer)
    .slice(-HISTORY_TURNS)
    .map((turn) => ({
      question: turn.question,
      picks: turn.answer!.picks.map(({ item }) => ({ media_type: item.media_type, id: item.id, title: item.title })),
    }));

function run(id: string, question: string, region: string, history: HistoryTurn[]) {
  const controller = new AbortController();
  requests.set(id, controller);

  const onEvent = (event: AssistantEvent) =>
    update(id, (turn) => {
      if (event.type === "status") return { ...turn, steps: [...turn.steps, event.text] };
      if (event.type === "answer") return { ...turn, answer: event, pending: false };
      return { ...turn, error: event.message, pending: false };
    });

  askAssistant({ question, region, history }, onEvent, controller.signal)
    .then(() => update(id, (turn) => (turn.pending ? { ...turn, pending: false, error: "The assistant stopped before answering." } : turn)))
    .catch((error: unknown) => {
      if (controller.signal.aborted) return; // the chat was cleared
      const message = error instanceof ApiError ? error.message : "Couldn't reach the assistant.";
      update(id, (turn) => ({ ...turn, pending: false, error: message }));
    })
    .finally(() => requests.delete(id));
}

/** Ask a new question in the current chat. One at a time. */
export function ask(question: string, region: string) {
  const earlier = current();
  if (earlier.some((turn) => turn.pending) || earlier.length >= MAX_TURNS) return;
  const id = crypto.randomUUID();
  save([...earlier, { id, question, steps: [], answer: null, error: null, pending: true }]);
  run(id, question, region, recap(earlier));
}

/** Ask a failed question again, with the conversation as it was at that point. */
export function retry(id: string, region: string) {
  const all = current();
  const index = all.findIndex((turn) => turn.id === id);
  if (index < 0 || all[index].pending) return;
  update(id, (turn) => ({ ...turn, steps: [], error: null, pending: true }));
  run(id, all[index].question, region, recap(all.slice(0, index)));
}

export function newChat() {
  requests.forEach((controller) => controller.abort());
  requests.clear();
  save([]);
}

/** Tests only: drop the in-memory chat, so the next read comes from localStorage. */
export function forgetChat() {
  requests.forEach((controller) => controller.abort());
  requests.clear();
  turns = null;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useChat = () => useSyncExternalStore(subscribe, current);
