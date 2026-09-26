import { anySignal, API_URL, ApiError } from "./client";
import type { AssistantEvent, MediaType } from "./types";

// Several searches plus the model's own thinking: far slower than a plain API call.
const TIMEOUT_MS = 60_000;

/** An earlier turn, in short: what was asked and which titles came back. */
export interface HistoryTurn {
  question: string;
  picks: { media_type: MediaType; id: number; title: string }[];
}

export interface AskRequest {
  question: string;
  region: string;
  /** The model has no memory: follow-ups need the earlier turns resent. */
  history: HistoryTurn[];
}

/**
 * Ask the AI assistant. The backend streams Server-Sent Events ("data: {json}" blocks separated
 * by a blank line); `onEvent` gets each one as soon as it arrives.
 */
export async function askAssistant(request: AskRequest, onEvent: (event: AssistantEvent) => void, signal?: AbortSignal): Promise<void> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: signal ? anySignal([signal, timeout]) : timeout,
  });
  if (!response.ok || !response.body) {
    // 429 and 503 explain themselves in `detail`.
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `The assistant failed (${response.status}).`;
    throw new ApiError(response.status, detail);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const dispatch = (block: string) => {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(line.startsWith("data: ") ? 6 : 5))
      .join("\n");
    if (data) onEvent(JSON.parse(data) as AssistantEvent);
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // SSE allows \r\n and \r line endings too.
      buffer += value.replace(/\r\n?/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? ""; // an incomplete block waits for the next chunk
      blocks.forEach(dispatch);
    }
    dispatch(buffer); // a last event without the closing blank line
  } finally {
    reader.cancel().catch(() => {}); // stop downloading if we bailed out early
  }
}
