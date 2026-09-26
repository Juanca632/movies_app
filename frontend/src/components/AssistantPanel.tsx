import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useRegionName } from "../api/queries";
import type { Pick } from "../api/types";
import { ASK_PARAM, useAskPanel } from "../lib/askPanel";
import { ask, MAX_TURNS, newChat, retry, useChat, type ChatTurn } from "../lib/chat";
import { useRegion } from "../lib/region";
import { imageUrl, isAdTier, mediaHref, year } from "../lib/tmdb";
import { useMediaQuery } from "../lib/useMediaQuery";
import ErrorState from "./ErrorState";
import { AiSparkIcon, CheckIcon, CloseIcon } from "./icons";
import Rating from "./Rating";
import TmdbImage from "./TmdbImage";

const EXAMPLES = [
  "Something funny and short for tonight",
  "A Korean thriller with great reviews",
  "Like Interstellar, on Netflix",
  "A cozy series to binge this weekend",
];

const MIN_LENGTH = 3;
const MAX_LENGTH = 300;
/** Dragging the phone sheet down this far closes it. */
const DISMISS_PX = 90;
/** Matches --animate-slide-down / --animate-slide-out-right. */
const EXIT_MS = 200;

function PickCard({ pick, to, regionName }: { pick: Pick; to: string; regionName: string }) {
  const { item } = pick;
  const services = pick.providers.filter((provider) => !isAdTier(provider));

  return (
    <li className="flex gap-3 rounded-xl bg-bg/50 p-3 ring-1 ring-white/5">
      {/* self-start: stretched to the text's height, the poster would lose its 2:3 shape. */}
      <Link to={to} tabIndex={-1} aria-hidden className="block aspect-[2/3] w-[5.5rem] shrink-0 self-start overflow-hidden rounded-lg">
        <TmdbImage path={item.poster_path} size="w185" alt="" />
      </Link>
      <div className="min-w-0 space-y-1.5">
        <h3 className="font-display text-base font-semibold leading-tight tracking-tight">
          <Link to={to} className="hover:text-accent">
            {item.title}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
          {[year(item.release_date), item.media_type === "tv" ? "TV" : "Movie"].filter(Boolean).join(" · ")}
          <Rating value={item.vote_average} className="text-muted" />
        </p>
        <p className="text-sm leading-relaxed text-muted">{pick.reason}</p>
        {services.length > 0 ? (
          <ul aria-label="Stream on" className="flex flex-wrap gap-1.5 pt-1">
            {services.map((provider) => {
              const logo = imageUrl(provider.logo_path, "w92");
              return (
                <li key={provider.provider_id} title={provider.provider_name}>
                  {logo ? (
                    <img src={logo} alt={provider.provider_name} loading="lazy" className="size-7 rounded-md ring-1 ring-white/10" />
                  ) : (
                    <span className="rounded-md bg-surface-2 px-2 py-1 text-xs">{provider.provider_name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-subtle">Not on a streaming subscription in {regionName}.</p>
        )}
      </div>
    </li>
  );
}

interface PanelProps {
  /** The panel has been closed and is playing its exit animation. */
  leaving: boolean;
  close: () => void;
}

function TurnView({ turn, pickHref, region, regionName }: { turn: ChatTurn; pickHref: (pick: Pick) => string; region: string; regionName: string }) {
  return (
    <article aria-label={turn.question} aria-busy={turn.pending} className="space-y-4">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-2 text-sm">{turn.question}</p>

      {turn.pending && (
        <ol aria-label="Progress" className="space-y-2 text-sm text-muted">
          {turn.steps.map((step, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckIcon className="size-4 shrink-0 text-subtle" />
              {step}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <AiSparkIcon className="size-4 shrink-0" />
            <span className="ai-shimmer">{turn.steps.length ? "Choosing the best picks…" : "Thinking…"}</span>
          </li>
        </ol>
      )}

      {turn.error && <ErrorState message={turn.error} onRetry={() => retry(turn.id, region)} />}

      {turn.answer && (
        <>
          <p className="text-sm leading-relaxed text-fg">{turn.answer.intro}</p>
          {turn.answer.picks.length > 0 && (
            <ul className="space-y-3">
              {turn.answer.picks.map((pick) => (
                <PickCard key={`${pick.item.media_type}-${pick.item.id}`} pick={pick} to={pickHref(pick)} regionName={regionName} />
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

function Panel({ leaving, close }: PanelProps) {
  // Wide screens: a card floating next to the page, which stays usable. Phones: a modal bottom sheet.
  const wide = useMediaQuery("(min-width: 640px)");
  const region = useRegion();
  const regionName = useRegionName(region);
  const chat = useChat();
  const busy = chat.some((turn) => turn.pending);
  const full = chat.length >= MAX_TURNS;
  const [draft, setDraft] = useState("");
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // `close` is a new function on every render; Escape always uses the latest one.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The sheet covers the page on phones: don't let the page scroll underneath it.
  useEffect(() => {
    if (wide) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, [wide]);

  // Opening shows the latest turn; a new question scrolls to it.
  const turnCount = chat.length;
  useEffect(() => {
    const last = scroller.current?.querySelector("article:last-of-type");
    last?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [turnCount]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (text.length < MIN_LENGTH || busy) return;
    setDraft("");
    ask(text, region);
  };

  // Swipe the sheet down by its top bar to dismiss it.
  const drag = {
    onPointerDown: (event: PointerEvent) => {
      if (wide || (event.target as HTMLElement).closest("button")) return;
      dragStart.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent) => {
      if (dragStart.current !== null) setDragY(Math.max(0, event.clientY - dragStart.current));
    },
    onPointerUp: () => {
      if (dragStart.current === null) return;
      dragStart.current = null;
      if (dragY > DISMISS_PX) close();
      else setDragY(0);
    },
  };

  // On wide screens the panel stays open over the pick's page; on phones the sheet gives way to it.
  const pickHref = (pick: Pick) => {
    const href = mediaHref(pick.item.media_type, pick.item.id, pick.item.title);
    return wide ? `${href}?${ASK_PARAM}=` : href;
  };

  // A dragged sheet finishes sliding down from where the finger left it; otherwise, keyframes.
  const dragStyle = dragY
    ? leaving
      ? { transform: "translateY(100%)", transition: `transform ${EXIT_MS}ms ease-in` }
      : { transform: `translateY(${dragY}px)` }
    : undefined;
  const motion = dragY ? "" : leaving ? "animate-slide-down sm:animate-slide-out-right" : "animate-slide-up sm:animate-slide-in-right";

  return (
    <>
      {!wide && (
        <div
          aria-hidden
          onClick={close}
          className={`fixed inset-0 z-[60] bg-black/60 ${leaving ? "animate-fade-out" : "animate-fade-in [animation-duration:200ms]"}`}
        />
      )}
      {/* Phones: a sheet from the bottom edge. Wide screens: a card floating over the page's right side. */}
      <aside
        role="dialog"
        aria-modal={!wide}
        aria-labelledby="assistant-title"
        style={dragStyle}
        className={`fixed inset-x-0 bottom-0 z-[60] flex h-[88dvh] flex-col rounded-t-2xl border-t border-white/10 bg-surface shadow-2xl shadow-black/60 sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:h-auto sm:w-[460px] sm:rounded-2xl lg:w-[520px] sm:border sm:bg-surface/95 sm:backdrop-blur-xl ${motion} ${
          leaving ? "pointer-events-none" : ""
        }`}
      >
        <header {...drag} className="touch-none select-none border-b border-white/5 sm:touch-auto sm:select-auto">
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-center gap-2 px-5 py-3">
            <h2 id="assistant-title" className="flex flex-1 items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <AiSparkIcon className="size-5" />
              Ask AI
            </h2>
            {chat.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  newChat();
                  input.current?.focus();
                }}
                className="rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-white/10 hover:text-fg"
              >
                New chat
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {chat.length === 0 ? (
            <div className="space-y-5">
              <div>
                <p className="font-display text-xl font-bold tracking-tight">Not sure what to watch?</p>
                <p className="mt-1 text-sm text-muted">
                  Describe a mood, a plot or a title you loved, then refine it (“more recent”, “less dark”). You'll get picks you can stream
                  in {regionName}.
                </p>
              </div>
              <ul aria-label="Examples" className="space-y-2">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => ask(example, region)}
                      className="w-full rounded-xl border border-white/10 bg-bg/40 px-4 py-2.5 text-left text-sm text-muted transition hover:border-white/25 hover:text-fg"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div ref={scroller} aria-live="polite" className="space-y-8">
              {chat.map((turn) => (
                <TurnView key={turn.id} turn={turn} pickHref={pickHref} region={region} regionName={regionName} />
              ))}
              <p className="text-xs text-subtle">Suggestions are AI-generated from TMDB data and can be wrong.</p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-white/5 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {full && <p className="mb-2 px-2 text-xs text-subtle">This chat is full. Start a new one to keep asking.</p>}
          {/* A thin gradient ring marks it as AI; while it works the colours circle around. */}
          <div className={`ai-ring flex items-center gap-2 rounded-full p-1 pl-4 [--ai-inner:var(--color-bg)] ${busy ? "ai-spin [--ai-glow:0.15]" : ""}`}>
            <label htmlFor="assistant-input" className="sr-only">
              Your request
            </label>
            <input
              id="assistant-input"
              ref={input}
              value={draft}
              disabled={full}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              placeholder={chat.length ? "Refine it or ask something else…" : "A short comedy on Netflix for tonight…"}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-subtle focus-visible:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={draft.trim().length < MIN_LENGTH || busy || full}
              className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-white/15 disabled:opacity-40"
            >
              Ask
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

/** The AI assistant: a floating panel (wide screens) or bottom sheet (phones) over the current page. */
function AssistantPanel() {
  const { open, linkedQuestion, close, clearLinkedQuestion } = useAskPanel();
  const region = useRegion();
  // However it closes (button, Escape, back button, following a pick), the URL loses `?ask` at
  // once; the panel stays a moment longer to animate out.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useEffect(() => {
    if (open) return;
    const id = setTimeout(() => setShown(false), EXIT_MS);
    return () => clearTimeout(id);
  }, [open]);

  // A shared link (?ask=something funny): ask it, then drop it from the URL so it's asked once.
  useEffect(() => {
    if (!linkedQuestion) return;
    ask(linkedQuestion, region);
    clearLinkedQuestion();
  }, [linkedQuestion]); // eslint-disable-line react-hooks/exhaustive-deps -- only a new question matters

  return shown ? <Panel leaving={!open} close={close} /> : null;
}

export default AssistantPanel;
