import { useState, type FormEvent } from "react";
import { useAskPanel } from "../lib/askPanel";
import { AiSparkIcon } from "./icons";

/** Home's slim entry to the AI assistant, right under the banner: typing here opens the panel. */
function AskBar() {
  const { openPanel } = useAskPanel();
  const [draft, setDraft] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    setDraft("");
    // Too short to be a question: just open the panel with its examples.
    openPanel(text.length >= 3 ? text : "");
  };

  return (
    <section aria-label="Ask AI" className="page-x">
      <form onSubmit={onSubmit} className="ai-ring flex max-w-2xl items-center gap-2 rounded-full p-1 pl-4 [--ai-inner:var(--color-surface)]">
        <AiSparkIcon className="size-4 shrink-0" />
        <label htmlFor="ask-bar" className="sr-only">
          Ask AI what to watch
        </label>
        <input
          id="ask-bar"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={300}
          placeholder="Not sure what to watch? Ask AI…"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none"
        />
        <button type="submit" className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-white/15">
          Ask
        </button>
      </form>
    </section>
  );
}

export default AskBar;
