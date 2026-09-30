import { useState, type FormEvent } from "react";
import { useAskPanel } from "../lib/askPanel";
import { AiSparkIcon } from "./icons";
import Row from "./Row";
import TmdbImage from "./TmdbImage";

interface Mood {
  label: string;
  /** What the assistant is asked. */
  question: string;
  /** A TMDB backdrop of a title that fits the mood. */
  backdrop: string;
}

// Each image is a well-known title for the mood (Superbad, Parasite, Interstellar...). The paths
// are TMDB's; if one ever disappears, TmdbImage shows its placeholder and the card still works.
const MOODS: Mood[] = [
  { label: "Funny & short", question: "Something funny and short for tonight", backdrop: "/coru98UcFBzJIU7bxZguxaePgu0.jpg" },
  { label: "Korean thrillers", question: "A Korean thriller with great reviews", backdrop: "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg" },
  { label: "Like Interstellar", question: "Movies like Interstellar", backdrop: "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg" },
  { label: "Cozy binge", question: "A cozy series to binge this weekend", backdrop: "/8U2ndZrneigI2zkvGuTJtt1ZsxK.jpg" },
  { label: "Scary, not gory", question: "A scary movie that isn't too gory", backdrop: "/bBQHALHRAaaORlPNXv7fNcRXYdx.jpg" },
  { label: "Mind-bending", question: "A mind-bending movie that makes me think", backdrop: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg" },
  { label: "Family night", question: "Something the whole family can watch together", backdrop: "/g7CHF8gTLGooTbP4GznIGwaqAGL.jpg" },
  { label: "Epic fantasy", question: "An epic fantasy series", backdrop: "/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg" },
  { label: "Date night", question: "A romantic movie for date night", backdrop: "/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg" },
];

function AskField() {
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
    <form onSubmit={onSubmit} className="ai-ring flex w-full items-center gap-2 rounded-full p-1 pl-4 [--ai-inner:var(--color-bg)] sm:max-w-sm">
      <label htmlFor="ask-bar" className="sr-only">
        Ask AI what to watch
      </label>
      <input
        id="ask-bar"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={300}
        placeholder="Or ask anything…"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-fg placeholder:text-muted focus-visible:outline-none"
      />
      <button type="submit" className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-fg transition hover:bg-white/15">
        Ask
      </button>
    </form>
  );
}

function MoodCard({ mood }: { mood: Mood }) {
  const { openPanel } = useAskPanel();
  return (
    <button
      type="button"
      onClick={() => openPanel(mood.question)}
      aria-label={`${mood.label}: ask AI for “${mood.question}”`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-surface text-left ring-1 ring-white/5 transition duration-300 hover:ring-ai-violet/60"
    >
      <TmdbImage path={mood.backdrop} size="w780" alt="" className="transition duration-500 group-hover:scale-105" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-3 bottom-2.5">
        <p className="font-display text-lg font-semibold leading-tight tracking-tight text-fg drop-shadow">{mood.label}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-fg/70 transition group-hover:text-fg">
          <AiSparkIcon className="size-3" />
          Ask AI
        </p>
      </div>
    </button>
  );
}

/** Home's AI entry as one more row: moods to pick from, or a question of your own. Both open the
 * assistant's panel. Being a row like the others keeps the AI part of browsing, not a form on top. */
function MoodRow() {
  return (
    <Row
      title="What are you in the mood for?"
      icon={<AiSparkIcon className="size-5 shrink-0" />}
      action={<AskField />}
      variant="wide"
      items={MOODS}
      getKey={(mood) => mood.label}
      renderItem={(mood) => <MoodCard mood={mood} />}
    />
  );
}

export default MoodRow;
