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
      <div className="ai-ring rounded-2xl [--ai-glow:0.12] [--ai-inner:var(--color-surface)]">
        {/* A faint wash of the AI colours from the corners, behind the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--color-ai-violet)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--color-ai-teal)_10%,transparent),transparent_55%)]"
        />

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:gap-8">
          <div>
            <h2 id="ask-ai-heading" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight sm:text-xl">
              <AiSparkIcon className="size-5 shrink-0" />
              Not sure what to watch?
            </h2>
            <p className="mt-1 text-sm text-muted">Describe a mood, a plot or a movie you loved, and AI finds something streaming for you.</p>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-full bg-bg/70 p-1 pl-4 ring-1 ring-white/10 transition focus-within:ring-ai-violet/60"
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
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/25 hover:text-fg"
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
