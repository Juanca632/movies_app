import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while `pending`, e.g. "Deleting…". */
  pendingLabel?: string;
  /** Red confirm button, for actions that cannot be undone. */
  danger?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small modal that asks before doing something. Render it only while it should be open. */
function ConfirmDialog({
  title,
  children,
  confirmLabel,
  pendingLabel,
  danger = false,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  // Read inside the effect without re-running it (which would steal focus again).
  const cancel = useRef(onCancel);
  cancel.current = pending ? () => {} : onCancel;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Cancel is the safe default: Enter right away must not delete anything.
    cancelButton.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => event.key === "Escape" && cancel.current();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Keep Tab cycling between the dialog's buttons.
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      onClick={(event) => event.target === event.currentTarget && cancel.current()}
      // Phones: an action sheet from the bottom edge, within thumb reach. Wider screens: a centered card.
      className="fixed inset-0 z-[80] grid animate-fade-in touch-none items-end bg-black/70 backdrop-blur-sm [animation-duration:150ms] sm:place-items-center sm:p-4"
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={trapFocus}
        className="w-full animate-slide-up rounded-t-2xl border-t border-white/10 bg-surface px-5 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/70 motion-reduce:animate-none sm:max-w-sm sm:animate-pop-in sm:rounded-2xl sm:border sm:p-6"
      >
        <h2 id={titleId} className="font-display text-lg font-bold tracking-tight text-fg">
          {title}
        </h2>
        <div id={messageId} className="mt-2 text-sm leading-relaxed text-muted">
          {children}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}
        {/* Phones: full-width buttons, the action on top where the thumb lands first. */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButton}
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-full px-4 py-3 text-sm font-semibold text-fg ring-1 ring-white/15 transition hover:bg-white/10 disabled:opacity-50 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-60 sm:py-2 ${
              danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-accent text-bg hover:bg-accent-strong"
            }`}
          >
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
