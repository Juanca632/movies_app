import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signInUrl, useAccount, useSignOut } from "../api/queries";
import type { Profile } from "../api/types";
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
  const { pathname, search, key } = useLocation();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

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
  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-fg transition-colors hover:bg-white/5";

  return (
    <div ref={container} className="relative shrink-0">
      <button
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
          <button
            type="button"
            role="menuitem"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate(undefined, { onSuccess: () => setOpen(false) })}
            className={`${item} border-t border-white/5`}
          >
            <SignOutIcon className="size-4 text-muted" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
