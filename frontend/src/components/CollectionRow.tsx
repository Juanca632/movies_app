import { useCollection } from "../api/queries";
import type { Collection } from "../api/types";
import { year } from "../lib/tmdb";
import Backdrop from "./Backdrop";
import { MediaRow } from "./rows";

/** "8 movies · 2001–2011", counting only released parts in the span. */
function summary(collection: Collection) {
  const count = collection.parts.length;
  const years = collection.parts.map((part) => year(part.release_date)).filter(Boolean);
  const first = years[0];
  const last = years[years.length - 1];
  const span = first && last && first !== last ? `${first}–${last}` : first;
  return [`${count} ${count === 1 ? "movie" : "movies"}`, span].filter(Boolean).join(" · ");
}

/** The saga a movie belongs to, in release order, over the saga's own backdrop. */
function CollectionRow({ collectionId, currentId }: { collectionId: number; currentId: number }) {
  const { data: collection } = useCollection(collectionId);
  // A saga of one (TMDB has a few) is not worth a row; a failed load just leaves it out.
  if (!collection || collection.parts.length < 2) return null;

  return (
    // The band's padding cancels out against the page's gap between rows (gap-10 sm:gap-12 in
    // MediaPage), so the backdrop fills that gap instead of adding to it.
    <div className="relative isolate -my-10 py-10 sm:-my-12 sm:py-12">
      <Backdrop path={collection.backdrop_path} blur fadeTop />
      <MediaRow title={collection.name} description={summary(collection)} items={collection.parts} currentId={currentId} />
    </div>
  );
}

export default CollectionRow;
