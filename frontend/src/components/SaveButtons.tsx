import type { ComponentType, SVGProps } from "react";
import { useLocation } from "react-router-dom";
import { signInUrl, useAccount, useSavedList, useToggleSaved } from "../api/queries";
import type { ListKind, MediaSummary } from "../api/types";
import { BookmarkIcon, HeartIcon } from "./icons";

interface List {
  kind: ListKind;
  label: string;
  name: string; // in "Add to …"
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const LISTS: List[] = [
  { kind: "watchlist", label: "My list", name: "My list", Icon: BookmarkIcon },
  { kind: "favorite", label: "Favorite", name: "favorites", Icon: HeartIcon },
];

type Item = Pick<MediaSummary, "id" | "media_type" | "title" | "poster_path" | "release_date">;

const STYLES = {
  // Next to "Watch trailer" on the detail page.
  full: "gap-2 px-4 py-2.5 text-sm",
  // Round icon buttons in the hover preview.
  icon: "size-8 justify-center",
};

function SaveButton({ item, kind, label, name, Icon, variant }: List & { item: Item; variant: keyof typeof STYLES }) {
  const { data: list } = useSavedList(kind);
  const toggle = useToggleSaved(kind);
  const saved = list?.some((t) => t.id === item.id && t.media_type === item.media_type) ?? false;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={variant === "icon" ? label : undefined}
      title={saved ? `Remove from ${name}` : `Add to ${name}`}
      disabled={list === undefined}
      onClick={() => {
        // Callers pass a whole detail or summary; keep only what a saved title has.
        const { id, media_type, title, poster_path, release_date } = item;
        const saved_at = new Date().toISOString();
        toggle.mutate({ item: { id, media_type, title, poster_path, release_date, saved_at }, save: !saved });
      }}
      className={`inline-flex items-center rounded-full font-semibold ring-1 backdrop-blur-sm transition disabled:opacity-60 ${STYLES[variant]} ${
        saved ? "bg-accent/15 text-accent ring-accent/50 hover:bg-accent/25" : "bg-white/10 text-fg ring-white/15 hover:bg-white/20"
      }`}
    >
      <Icon className="size-4" fill={saved ? "currentColor" : "none"} />
      {variant === "full" && label}
    </button>
  );
}

/** "My list" and "Favorite" toggles. Signed out they lead to sign-in; without accounts, nothing. */
function SaveButtons({ item, variant = "full", className = "" }: { item: Item; variant?: keyof typeof STYLES; className?: string }) {
  const { data: account } = useAccount();
  const { pathname, search } = useLocation();

  if (account?.status === "signed-out") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {LISTS.map(({ kind, label, Icon }) => (
          <a
            key={kind}
            href={signInUrl(pathname + search)}
            aria-label={variant === "icon" ? `${label}: sign in` : undefined}
            title={`Sign in to save ${item.title}`}
            className={`inline-flex items-center rounded-full bg-white/10 font-semibold text-fg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/20 ${STYLES[variant]}`}
          >
            <Icon className="size-4" />
            {variant === "full" && label}
          </a>
        ))}
      </div>
    );
  }
  if (account?.status !== "signed-in") return null;
  return (
    <div className={`flex gap-2 ${className}`}>
      {LISTS.map((list) => (
        <SaveButton key={list.kind} {...list} item={item} variant={variant} />
      ))}
    </div>
  );
}

export default SaveButtons;
