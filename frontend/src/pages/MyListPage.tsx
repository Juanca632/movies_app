import type { ComponentType, ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { signInUrl, useAccount, useSavedList } from "../api/queries";
import type { ListKind, MediaSummary, SavedTitle } from "../api/types";
import { CARD_GRID, CardSkeleton, MediaCard } from "../components/cards";
import Chip from "../components/Chip";
import ErrorState from "../components/ErrorState";
import { BookmarkIcon, HeartIcon } from "../components/icons";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { NotFoundPage } from "./StatusPages";

// ?tab= in the URL; the API calls the second list "favorite".
interface Tab {
  tab: string;
  kind: ListKind;
  label: string;
  icon: ComponentType<{ className?: string }>;
  empty: string;
}

const TABS: Tab[] = [
  {
    tab: "watchlist",
    kind: "watchlist",
    label: "My list",
    icon: BookmarkIcon,
    empty: "Save movies and shows to watch later with the bookmark button.",
  },
  { tab: "favorites", kind: "favorite", label: "Favorites", icon: HeartIcon, empty: "Mark the ones you love with the heart button." },
];

const BUTTON = "rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-strong";

/** Centered, like a native app's empty screen, instead of a stray line at the top-left. */
function EmptyState({ icon: Icon, children, action }: { icon: Tab["icon"]; children: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center sm:py-16">
      <span className="grid size-16 place-items-center rounded-full bg-surface ring-1 ring-white/10">
        <Icon className="size-7 text-accent" />
      </span>
      <p className="max-w-xs text-muted">{children}</p>
      {action}
    </div>
  );
}

// Cards take a full summary; a saved title has no rating or overview, so those stay empty.
const toSummary = (saved: SavedTitle): MediaSummary => ({
  ...saved,
  overview: "",
  backdrop_path: null,
  vote_average: 0,
  vote_count: 0,
  genre_ids: [],
});

function Header() {
  return (
    <header className="mb-6">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">My list</h1>
    </header>
  );
}

function SavedGrid({ kind, icon, empty }: Pick<Tab, "kind" | "icon" | "empty">) {
  const { data, isPending, isError, refetch } = useSavedList(kind);

  if (isError) return <ErrorState message="We couldn't load your list." onRetry={() => refetch()} />;
  if (isPending) {
    return (
      <div className={CARD_GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        icon={icon}
        action={
          <Link to="/" className={BUTTON}>
            Find something
          </Link>
        }
      >
        {empty}
      </EmptyState>
    );
  }
  return (
    <ul className={CARD_GRID}>
      {data.map((saved) => (
        <li key={`${saved.media_type}-${saved.id}`}>
          <MediaCard item={toSummary(saved)} />
        </li>
      ))}
    </ul>
  );
}

function MyListPage() {
  const [params, setParams] = useSearchParams();
  const { pathname, search } = useLocation();
  const { data: account } = useAccount();
  const current = TABS.find((t) => t.tab === params.get("tab")) ?? TABS[0];
  useDocumentTitle(current.label);

  if (!account) return <div className="page-x pt-24 sm:pt-28" />;
  if (account.status === "unavailable") return <NotFoundPage />;

  return (
    <div className="page-x pt-24 sm:pt-28">
      {account.status === "signed-out" ? (
        <>
          <Header />
          <EmptyState
            icon={BookmarkIcon}
            action={
              <a href={signInUrl(pathname + search)} className={BUTTON}>
                Sign in with Google
              </a>
            }
          >
            Sign in to save movies and shows to watch later, and keep your favorites.
          </EmptyState>
        </>
      ) : (
        <>
          <Header />
          <div role="group" aria-label="List" className="mb-8 flex gap-2">
            {TABS.map((t) => (
              <Chip key={t.tab} active={t === current} onClick={() => setParams({ tab: t.tab }, { replace: true })}>
                {t.label}
              </Chip>
            ))}
          </div>
          <SavedGrid key={current.kind} kind={current.kind} icon={current.icon} empty={current.empty} />
        </>
      )}
    </div>
  );
}

export default MyListPage;
