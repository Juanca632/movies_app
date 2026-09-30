import { useState, type FormEvent } from "react";
import { ASK_EXAMPLES, useAskPanel } from "../lib/askPanel";
import { AiSparkIcon } from "./icons";

/** Home's entry to the AI assistant: a small section between the banner and the rows. Asking here
 * (typing or picking an example) opens the panel. */
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
    <section aria-labelledby="ask-ai-heading" className="page-x">
      {/* Filled with the page colour, not a surface grey: only the thin AI ring marks the section, so
          it sits between the banner's fade and the rows instead of looking like a box on top. */}
      <div className="ai-ring rounded-2xl [--ai-glow:0.08] [--ai-inner:var(--color-bg)]">
        <div className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center lg:gap-x-8">
          <div>
            <h2 id="ask-ai-heading" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight sm:text-lg">
              <AiSparkIcon className="size-4 shrink-0" />
              Not sure what to watch?
            </h2>
            <p className="mt-0.5 text-sm text-muted">Describe a mood, a plot or a movie you loved, and AI finds something streaming for you.</p>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-full bg-surface/70 p-1 pl-4 ring-1 ring-white/10 transition focus-within:ring-ai-violet/60"
          >
            <label htmlFor="ask-bar" className="sr-only">
              Ask AI what to watch
            </label>
            <input
              id="ask-bar"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={300}
              placeholder="Ask AI…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none"
            />
            <button type="submit" className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:bg-accent-strong">
              Ask
            </button>
          </form>

          <ul aria-label="Try asking" className="flex flex-wrap gap-2 lg:col-span-2">
            {ASK_EXAMPLES.map((example, index) => (
              // Two are enough on phones; the rest would push the rows down.
              <li key={example} className={index >= 2 ? "hidden sm:block" : undefined}>
                <button
                  type="button"
                  onClick={() => openPanel(example)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-subtle transition hover:border-white/25 hover:text-fg"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default AskBar;
