import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signInUrl, useAccount, useDeleteAccount, useSignOut } from "../api/queries";
import type { Profile } from "../api/types";
import ConfirmDialog from "./ConfirmDialog";
import { BookmarkIcon, HeartIcon, SignOutIcon } from "./icons";

function Avatar({ profile, className = "" }: { profile: Profile; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!profile.avatar_url || broken) {
    return (
      <span aria-hidden className={`grid place-items-center rounded-full bg-accent font-semibold text-bg ${className}`}>
        {profile.name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={profile.avatar_url}
      alt=""
      // Google's avatar host may refuse requests that carry a Referer.
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

/** "Sign in", or the user's avatar with a menu. Renders nothing when the server has no accounts. */
function AccountMenu() {
  const { data: account } = useAccount();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const { pathname, search, key } = useLocation();
  const [open, setOpen] = useState(false);
  // Signing out and deleting ask first, in a dialog.
  const [confirming, setConfirming] = useState<"sign-out" | "delete" | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const avatarButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [key]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (account?.status === "signed-out") {
    return (
      <a
        href={signInUrl(pathname + search)}
        className="shrink-0 whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-bg transition hover:bg-accent-strong"
      >
        Sign in
      </a>
    );
  }
  if (account?.status !== "signed-in") return null;

  const { profile } = account;

  const ask = (action: "sign-out" | "delete") => {
    setOpen(false);
    // The menu item is about to disappear; focus returns to the avatar when the dialog closes.
    avatarButton.current?.focus();
    signOut.reset();
    deleteAccount.reset();
    setConfirming(action);
  };
  const dismiss = () => setConfirming(null);
  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-fg transition-colors hover:bg-white/5";

  return (
    <div ref={container} className="relative shrink-0">
      <button
        ref={avatarButton}
        type="button"
        aria-label={`Account: ${profile.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`block rounded-full ring-2 transition ${open ? "ring-accent/70" : "ring-transparent hover:ring-white/25"}`}
      >
        <Avatar profile={profile} className="size-8" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-surface/95 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
            <Avatar profile={profile} className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{profile.name}</p>
              <p className="truncate text-xs text-subtle">{profile.email}</p>
            </div>
          </div>
          <Link role="menuitem" to="/my-list" className={item}>
            <BookmarkIcon className="size-4 text-muted" />
            My list
          </Link>
          <Link role="menuitem" to="/my-list?tab=favorites" className={item}>
            <HeartIcon className="size-4 text-muted" />
            Favorites
          </Link>
          <button type="button" role="menuitem" onClick={() => ask("sign-out")} className={`${item} border-t border-white/5`}>
            <SignOutIcon className="size-4 text-muted" />
            Sign out
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => ask("delete")}
            className="w-full px-4 py-2 text-left text-xs text-subtle transition-colors hover:bg-white/5 hover:text-red-400"
          >
            Delete account
          </button>
        </div>
      )}

      {confirming === "sign-out" && (
        <ConfirmDialog
          title="Sign out?"
          confirmLabel="Sign out"
          pendingLabel="Signing out…"
          pending={signOut.isPending}
          error={signOut.isError ? "Couldn't sign out. Try again." : null}
          onConfirm={() => signOut.mutate()}
          onCancel={dismiss}
        >
          Your list and favorites stay saved; sign in again to see them.
        </ConfirmDialog>
      )}
      {confirming === "delete" && (
        <ConfirmDialog
          title="Delete your account?"
          confirmLabel="Delete account"
          pendingLabel="Deleting…"
          danger
          pending={deleteAccount.isPending}
          error={deleteAccount.isError ? "Couldn't delete your account. Try again." : null}
          onConfirm={() => deleteAccount.mutate()}
          onCancel={dismiss}
        >
          This erases your account, your list and your favorites for good. You can sign in again later, but they won't
          come back.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default AccountMenu;
