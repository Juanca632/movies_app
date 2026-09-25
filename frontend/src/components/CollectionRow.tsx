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
    <div className="relative isolate py-8">
      <Backdrop path={collection.backdrop_path} blur />
      <MediaRow title={collection.name} description={summary(collection)} items={collection.parts} currentId={currentId} />
    </div>
  );
}

export default CollectionRow;
