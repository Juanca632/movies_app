import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { signInUrl, useAccount } from "../api/queries";
import { ASK_EXAMPLES, ASK_PARAM, useAskPanel } from "../lib/askPanel";
import { closeWelcome, hasSeenWelcome, showWelcome, useWelcomeOpen, whenSplashGone } from "../lib/welcome";
import { AiSparkIcon, BookmarkIcon, CalendarIcon, CloseIcon, FilmIcon, GlobeIcon, HeartIcon } from "./icons";

/** Time on the page before the tour opens, so the visitor sees where they landed first. */
const OPEN_DELAY_MS = 600;

function Feature({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-accent">
        {icon}
      </span>
      <span className="self-center">{children}</span>
    </li>
  );
}

function WelcomeStep() {
  return (
    <>
      <p>A streaming-style guide to movies, TV shows and the people who make them.</p>
      <ul className="mt-5 space-y-3">
        <Feature icon={<FilmIcon className="size-5" />}>Browse trending titles, trailers, ratings, awards and full casts.</Feature>
        <Feature icon={<GlobeIcon className="size-5" />}>See where every title is streaming in your country.</Feature>
        <Feature icon={<CalendarIcon className="size-5" />}>Follow what's coming to theaters, streaming and TV each month.</Feature>
      </ul>
    </>
  );
}

/** A made-up exchange, to show what the assistant does without spending a real question. */
function SampleChat() {
  return (
    <div aria-hidden className="mt-5 space-y-2 rounded-xl bg-bg/60 p-3 text-[13px]">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-white/10 px-3 py-2 text-fg">
        A Korean thriller with great reviews, on Netflix
      </p>
      <div className="ai-ring w-fit max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-fg [--ai-inner:var(--color-surface)]">
        <p className="flex items-center gap-1.5 font-semibold">
          <AiSparkIcon className="size-3.5" /> 4 picks streaming in your country
        </p>
        <p className="mt-0.5 text-muted">Each one with a line on why it fits.</p>
      </div>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-white/10 px-3 py-2 text-fg">Something shorter?</p>
    </div>
  );
}

function AiStep({ onTry }: { onTry: (question: string) => void }) {
  return (
    <>
      <p>
        Not sure what to watch? Describe your mood in your own words. The AI assistant searches the catalogue and picks titles
        you can actually stream where you are, and you can keep the conversation going to fine-tune them.
      </p>
      <SampleChat />
      <p className="mt-5 text-xs font-semibold tracking-wide text-subtle uppercase">Try one</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ASK_EXAMPLES.slice(0, 3).map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onTry(question)}
            className="rounded-full bg-white/5 px-3 py-1.5 text-left text-xs text-fg ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-ai-violet/60 active:scale-95"
          >
            {question}
          </button>
        ))}
      </div>
    </>
  );
}

function AccountStep() {
  return (
    <>
      <p>Signing in with Google is optional; everything else works without an account. With one you get:</p>
      <ul className="mt-5 space-y-3">
        <Feature icon={<HeartIcon className="size-5" />}>Favorites and a watchlist, on any device.</Feature>
        <Feature icon={<BookmarkIcon className="size-5" />}>Recommendations based on what you save.</Feature>
        <Feature icon={<AiSparkIcon className="size-5" />}>AI picks for your taste on the home page, and an assistant that knows it.</Feature>
      </ul>
    </>
  );
}

interface Step {
  title: ReactNode;
  body: ReactNode;
}

/**
 * A short tour on a first visit: what the app is, what the AI assistant does, and what an account
 * adds. Most visitors arrive from the portfolio without context, so it opens by itself once.
 */
function WelcomeTour() {
  const open = useWelcomeOpen();
  const { pathname, search } = useLocation();
  const { openPanel } = useAskPanel();
  const { data: account } = useAccount();

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
    { title: "Welcome to MoviesApp", body: <WelcomeStep /> },
    {
      title: (
        <span className="flex items-center gap-2">
          <AiSparkIcon className="size-5" /> Just ask the AI
        </span>
      ),
      body: <AiStep onTry={tryQuestion} />,
    },
  ];
  // Pitching an account only makes sense when the server has accounts and the visitor has none.
  if (account?.status === "signed-out") steps.push({ title: "Make it yours", body: <AccountStep /> });

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

  return createPortal(
    <div
      onClick={(event) => event.target === event.currentTarget && closeWelcome()}
      // Phones: a sheet from the bottom edge. Wider screens: a centered card.
      className="fixed inset-0 z-[80] grid animate-fade-in items-end bg-black/70 backdrop-blur-sm [animation-duration:200ms] sm:place-items-center sm:p-4"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="relative max-h-[90dvh] w-full animate-slide-up overflow-y-auto rounded-t-2xl border-t border-white/10 bg-surface px-5 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/70 motion-reduce:animate-none sm:max-w-md sm:animate-pop-in sm:rounded-2xl sm:border sm:p-7"
      >
        <button
          type="button"
          onClick={closeWelcome}
          aria-label="Skip the tour"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
        >
          <CloseIcon className="size-4" />
        </button>
        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
          {current + 1} of {steps.length}
        </p>
        {/* Keyed, so each step fades in. */}
        <div key={current} className="animate-fade-in [animation-duration:250ms]">
          <h2 id={titleId} className="mt-1 pr-8 font-display text-2xl font-bold tracking-tight text-fg">
            {step.title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-muted">{step.body}</div>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 sm:justify-between">
          {/* Phones have "1 of 3" and need the room for the buttons. */}
          <div aria-hidden className="hidden gap-1.5 sm:flex">
            {steps.map((_, dot) => (
              <span key={dot} className={`h-1.5 rounded-full transition-all ${dot === current ? "w-5 bg-accent" : "w-1.5 bg-white/20"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {current > 0 && (
              <button
                type="button"
                onClick={() => setIndex(current - 1)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-fg ring-1 ring-white/15 transition hover:bg-white/10"
              >
                Back
              </button>
            )}
            {last && withSignIn && (
              <a
                href={signInHref}
                className="rounded-full px-4 py-2 text-sm font-semibold text-fg ring-1 ring-white/15 transition hover:bg-white/10"
              >
                Sign in
              </a>
            )}
            <button
              ref={nextButton}
              type="button"
              onClick={() => (last ? closeWelcome() : setIndex(current + 1))}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:bg-accent-strong"
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
