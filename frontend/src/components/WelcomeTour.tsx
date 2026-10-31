import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { signInUrl, useAccount, useMediaList } from "../api/queries";
import { ASK_EXAMPLES, ASK_PARAM, useAskPanel } from "../lib/askPanel";
import { imageUrl } from "../lib/tmdb";
import { closeWelcome, hasSeenWelcome, showWelcome, useWelcomeOpen, whenSplashGone } from "../lib/welcome";
import { AiSparkIcon, BookmarkIcon, ChevronLeftIcon, CloseIcon, HeartIcon } from "./icons";

/** Time on the page before the tour opens, so the visitor sees where they landed first. */
const OPEN_DELAY_MS = 600;

/** Each step's picture pops in piece by piece (`delay(ms)`) instead of appearing at once. */
const POP = "animate-pop-in motion-reduce:animate-none";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Popular posters (the hero's query, so usually already cached), or nothing while they load. */
function usePosters() {
  const { data } = useMediaList("movie", "popular");
  return (data ?? []).flatMap((item) => imageUrl(item.poster_path, "w342") ?? []);
}

function Poster({ src, className = "" }: { src: string | undefined; className?: string }) {
  return (
    <div className={`aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-lg shadow-black/60 ring-1 ring-white/10 ${className}`}>
      {src && <img src={src} alt="" className="size-full object-cover" />}
    </div>
  );
}

// A fan of five posters, stacked symmetrically towards the middle one. The z-index goes on the
// animated wrapper: its transform makes it a stacking context, so one inside it would be ignored.
const FAN = [
  { stack: "z-0", tilt: "-rotate-12 translate-y-6" },
  { stack: "z-10", tilt: "-rotate-6 translate-y-2" },
  { stack: "z-20", tilt: "scale-110" },
  { stack: "z-10", tilt: "rotate-6 translate-y-2" },
  { stack: "z-0", tilt: "rotate-12 translate-y-6" },
];

function PosterFan({ posters }: { posters: string[] }) {
  return (
    <div className="flex h-60 items-center justify-center sm:h-72">
      {FAN.map(({ stack, tilt }, i) => (
        <div key={i} style={delay(80 * i)} className={`${POP} relative -mx-2.5 w-[24%] max-w-36 ${stack}`}>
          <Poster src={posters[i]} className={`rounded-xl ${tilt}`} />
        </div>
      ))}
    </div>
  );
}

/** A made-up exchange, to show what the assistant does without spending a real question. */
function SampleChat({ posters }: { posters: string[] }) {
  return (
    <div aria-hidden className="flex h-60 flex-col justify-center gap-3 rounded-2xl bg-bg/60 p-4 text-sm sm:h-72 sm:p-5">
      <p className={`${POP} ml-auto w-fit rounded-2xl rounded-br-sm bg-white/10 px-4 py-2.5 text-fg`}>
        Something fun for tonight
      </p>
      <div
        style={delay(450)}
        className={`${POP} ai-ring w-fit rounded-2xl rounded-bl-sm p-3 [--ai-inner:var(--color-surface)]`}
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <AiSparkIcon className="size-4" /> 3 picks you can stream
        </p>
        <div className="mt-2.5 flex gap-2">
          {[5, 6, 7].map((i) => (
            <Poster key={i} src={posters[i]} className="w-16 rounded-md shadow-none sm:w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

const PERKS = [
  { icon: <HeartIcon className="size-9" />, label: "Favorites" },
  { icon: <BookmarkIcon className="size-9" />, label: "Watchlist" },
  { icon: <AiSparkIcon className="size-9" />, label: "AI picks" },
];

function Perks() {
  return (
    <ul className="grid h-44 grid-cols-3 items-center gap-3 sm:h-52">
      {PERKS.map(({ icon, label }, i) => (
        <li key={label} style={delay(100 * i)} className={`${POP} flex flex-col items-center gap-3`}>
          <span aria-hidden className="grid size-20 place-items-center rounded-3xl sm:size-24 bg-accent/10 text-accent ring-1 ring-accent/20">
            {icon}
          </span>
          <span className="text-sm font-semibold text-fg sm:text-base">{label}</span>
        </li>
      ))}
    </ul>
  );
}

function TryChips({ onTry }: { onTry: (question: string) => void }) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {ASK_EXAMPLES.slice(0, 2).map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onTry(question)}
          className="rounded-full bg-white/5 px-4 py-2 text-sm text-fg ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-ai-violet/60 active:scale-95"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

interface Step {
  picture: ReactNode;
  title: ReactNode;
  line: string;
  extra?: ReactNode;
}

/**
 * A short, mostly visual tour on a first visit: what the app is, what the AI assistant does, and
 * what an account adds. Most visitors arrive from the portfolio without context, so it opens by
 * itself once. One line of text per step; the pictures do the explaining.
 */
function WelcomeTour() {
  const open = useWelcomeOpen();
  const { pathname, search } = useLocation();
  const { openPanel } = useAskPanel();
  const { data: account } = useAccount();
  const posters = usePosters();

  // First visit only. Not over the privacy policy (Google's reviewers read it) or over a shared
  // `?ask=` link, which already opens the assistant.
  useEffect(() => {
    if (hasSeenWelcome() || pathname === "/privacy" || new URLSearchParams(search).has(ASK_PARAM)) return;
    let timer: ReturnType<typeof setTimeout>;
    const stop = whenSplashGone(() => {
      timer = setTimeout(showWelcome, OPEN_DELAY_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
    // Decided once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const tryQuestion = (question: string) => {
    closeWelcome();
    openPanel(question);
  };
  const steps: Step[] = [
    {
      picture: <PosterFan posters={posters} />,
      title: "Welcome to MoviesApp",
      line: "Find your next movie or show, and where to stream it.",
    },
    {
      picture: <SampleChat posters={posters} />,
      title: (
        <span className="inline-flex items-center gap-2">
          <AiSparkIcon className="size-7" /> Just ask the AI
        </span>
      ),
      line: "Describe a mood, get picks you can watch tonight.",
      extra: <TryChips onTry={tryQuestion} />,
    },
  ];
  // Pitching an account only makes sense when the server has accounts and the visitor has none.
  if (account?.status === "signed-out") {
    steps.push({ picture: <Perks />, title: "Make it yours", line: "Optional. Sign in with Google to save titles." });
  }

  return <TourDialog steps={steps} signInHref={signInUrl(pathname + search)} withSignIn={account?.status === "signed-out"} />;
}

function TourDialog({ steps, signInHref, withSignIn }: { steps: Step[]; signInHref: string; withSignIn: boolean }) {
  const [index, setIndex] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // The account answer may arrive while the tour is open and drop the last step.
  const current = Math.min(index, steps.length - 1);
  const last = current === steps.length - 1;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nextButton.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => event.key === "Escape" && closeWelcome();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Keep Tab inside the dialog.
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const focusable = [...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      first.focus();
    }
  };

  const step = steps[current];
  const secondaryButton = "whitespace-nowrap rounded-full text-sm sm:text-base font-semibold text-fg ring-1 ring-white/15 transition hover:bg-white/10";

  return createPortal(
    <div
      onClick={(event) => event.target === event.currentTarget && closeWelcome()}
      // A floating card on every screen: it is a welcome, not a menu, so no bottom sheet on phones.
      className="fixed inset-0 z-[80] grid animate-fade-in place-items-center bg-black/70 p-4 backdrop-blur-sm [animation-duration:200ms]"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-pop-in overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 shadow-2xl shadow-black/70 motion-reduce:animate-none sm:p-8"
      >
        <button
          type="button"
          onClick={closeWelcome}
          aria-label="Skip the tour"
          className="absolute top-3 right-3 z-20 grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
        >
          <CloseIcon className="size-4" />
        </button>
        <p className="sr-only">
          {current + 1} of {steps.length}
        </p>
        {/* Keyed, so each step plays its entrance again. */}
        <div key={current} className="animate-fade-in text-center [animation-duration:250ms]">
          <div className="mt-6">{step.picture}</div>
          <h2 id={titleId} className="mt-6 font-display text-3xl font-bold sm:text-4xl tracking-tight text-fg">
            {step.title}
          </h2>
          <p className="mt-2 text-base text-balance text-muted sm:text-lg">{step.line}</p>
          {step.extra}
        </div>

        <div className="mt-7 flex flex-col items-center gap-4 sm:mt-8 sm:flex-row sm:justify-between sm:gap-2">
          <div aria-hidden className="flex gap-1.5">
            {steps.map((_, dot) => (
              <span key={dot} className={`h-2 rounded-full transition-all ${dot === current ? "w-6 bg-accent" : "w-2 bg-white/20"}`} />
            ))}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {current > 0 && (
              <button
                type="button"
                onClick={() => setIndex(current - 1)}
                aria-label="Back"
                className={`grid size-11 shrink-0 place-items-center ${secondaryButton}`}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            )}
            {last && withSignIn && (
              <a href={signInHref} className={`px-5 py-2.5 ${secondaryButton}`}>
                Sign in
              </a>
            )}
            <button
              ref={nextButton}
              type="button"
              onClick={() => (last ? closeWelcome() : setIndex(current + 1))}
              className="flex-1 whitespace-nowrap rounded-full bg-accent px-4 py-2.5 sm:flex-none text-sm font-semibold text-bg transition hover:bg-accent-strong sm:px-6 sm:text-base"
            >
              {last ? "Start exploring" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default WelcomeTour;
