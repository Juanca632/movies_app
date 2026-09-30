import { Link, useLocation, useSearchParams } from "react-router-dom";
import { signInUrl, useAccount, useSavedList } from "../api/queries";
import type { ListKind, MediaSummary, SavedTitle } from "../api/types";
import { CARD_GRID, CardSkeleton, MediaCard } from "../components/cards";
import Chip from "../components/Chip";
import ErrorState from "../components/ErrorState";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { NotFoundPage } from "./StatusPages";

// ?tab= in the URL; the API calls the second list "favorite".
const TABS: { tab: string; kind: ListKind; label: string; empty: string }[] = [
  { tab: "watchlist", kind: "watchlist", label: "My list", empty: "Save movies and shows to watch later with the bookmark button." },
  { tab: "favorites", kind: "favorite", label: "Favorites", empty: "Mark the ones you love with the heart button." },
];

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

function SavedGrid({ kind, empty }: { kind: ListKind; empty: string }) {
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
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">{empty}</p>
        <Link to="/" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:bg-accent-strong">
          Find something
        </Link>
      </div>
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
          <div className="flex flex-col items-start gap-4">
            <p className="text-muted">Sign in to save movies and shows to watch later, and keep your favorites.</p>
            <a
              href={signInUrl(pathname + search)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:bg-accent-strong"
            >
              Sign in with Google
            </a>
          </div>
        </>
      ) : (
        <>
          <Header />
          <div role="group" aria-label="List" className="mb-8 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Chip key={t.tab} active={t === current} onClick={() => setParams({ tab: t.tab }, { replace: true })}>
                {t.label}
              </Chip>
            ))}
          </div>
          <SavedGrid key={current.kind} kind={current.kind} empty={current.empty} />
        </>
      )}
    </div>
  );
}

export default MyListPage;
