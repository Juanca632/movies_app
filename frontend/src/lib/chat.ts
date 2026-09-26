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
/** What the backend accepts as a question. */
export const MIN_QUESTION = 3;
export const MAX_QUESTION = 300;

/*
 * The conversation lives here, outside React, so it survives closing the panel (a request on its
 * way keeps going) and is saved in localStorage so it survives reloads. With accounts (phase 2)
 * this would move to the database.
 */
let turns: ChatTurn[] | null = null;
const listeners = new Set<() => void>();
/** The request running for each turn. A retry replaces it; the old one's late events are ignored. */
const requests = new Map<string, AbortController>();

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** A stored turn, if it still has the shape the panel needs (old or hand-edited data may not). */
function restore(value: unknown): ChatTurn | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.question !== "string") return null;
  const answer = value.answer;
  const validAnswer =
    isObject(answer) &&
    typeof answer.intro === "string" &&
    Array.isArray(answer.picks) &&
    answer.picks.every((pick) => isObject(pick) && isObject(pick.item) && Array.isArray(pick.providers));
  if (answer != null && !validAnswer) return null;
  return {
    id: value.id,
    question: value.question,
    steps: [],
    answer: validAnswer ? (answer as unknown as AssistantAnswer) : null,
    // Nothing is running after a reload: a turn saved mid-answer shows as failed, with a retry.
    error: typeof value.error === "string" ? value.error : validAnswer ? null : "This question didn't finish.",
    pending: false,
  };
}

function load(): ChatTurn[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.map(restore).filter((turn): turn is ChatTurn => turn !== null);
  } catch {
    return []; // private mode, blocked storage or a corrupted value: start empty
  }
}

const current = () => (turns ??= load());
const notify = () => listeners.forEach((listener) => listener());

function save(next: ChatTurn[]) {
  turns = next;
  try {
    // Unfinished turns aren't kept: after a reload nothing would complete them.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((turn) => !turn.pending)));
  } catch {
    // Storage full or blocked: the chat still works, it just won't survive a reload.
  }
  notify();
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

function failureMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "TimeoutError") return "The assistant took too long. Try again.";
  return "Couldn't reach the assistant.";
}

function run(id: string, question: string, region: string, history: HistoryTurn[]) {
  const controller = new AbortController();
  requests.set(id, controller);
  // Only the latest request for a turn may touch it.
  const latest = () => requests.get(id) === controller;

  const onEvent = (event: AssistantEvent) => {
    if (!latest()) return;
    update(id, (turn) => {
      if (event.type === "status") return { ...turn, steps: [...turn.steps, event.text] };
      if (event.type === "answer") return { ...turn, answer: event, pending: false };
      return { ...turn, error: event.message, pending: false };
    });
  };

  askAssistant({ question, region, history }, onEvent, controller.signal)
    .then(() => {
      if (latest()) update(id, (turn) => (turn.pending ? { ...turn, pending: false, error: "The assistant stopped before answering." } : turn));
    })
    .catch((error: unknown) => {
      if (!latest() || controller.signal.aborted) return; // replaced, or the chat was cleared
      update(id, (turn) => ({ ...turn, pending: false, error: failureMessage(error) }));
    })
    .finally(() => {
      if (latest()) requests.delete(id);
    });
}

/** Whether a question can be asked now: one at a time, and only while the chat has room. */
export const canAsk = (chat: ChatTurn[]) => !chat.some((turn) => turn.pending) && chat.length < MAX_TURNS;

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Ask a new question in the current chat. False if it wasn't asked (see canAsk, question length). */
export function ask(question: string, region: string): boolean {
  const text = question.trim();
  const earlier = current();
  if (text.length < MIN_QUESTION || text.length > MAX_QUESTION || !canAsk(earlier)) return false;
  const id = newId();
  save([...earlier, { id, question: text, steps: [], answer: null, error: null, pending: true }]);
  run(id, text, region, recap(earlier));
  return true;
}

/** Ask a failed question again, with the conversation as it was at that point. */
export function retry(id: string, region: string) {
  const all = current();
  const index = all.findIndex((turn) => turn.id === id);
  if (index < 0 || all.some((turn) => turn.pending)) return;
  update(id, (turn) => ({ ...turn, steps: [], answer: null, error: null, pending: true }));
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

// Another tab changed the chat: follow it, unless this tab is waiting for an answer.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || current().some((turn) => turn.pending)) return;
    turns = load();
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useChat = () => useSyncExternalStore(subscribe, current);
