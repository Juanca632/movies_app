import { useAiPicks } from "../api/queries";
import type { Pick } from "../api/types";
import { MediaCard } from "./cards";
import { AiSparkIcon } from "./icons";
import Row from "./Row";

function PickCard({ pick }: { pick: Pick }) {
  return (
    <div>
      <MediaCard item={pick.item} />
      <p className="mt-1 line-clamp-3 text-xs leading-snug text-muted">{pick.reason}</p>
    </div>
  );
}

/**
 * The AI's own picks from the signed-in user's lists, each with why. Made on the server without
 * being asked and reused until the lists change, so most loads cost nothing.
 */
function AiPicksRow() {
  const query = useAiPicks();
  return (
    <Row
      title="Picked for You by AI"
      icon={<AiSparkIcon className="size-5 shrink-0" />}
      description={query.data?.intro ?? (query.isLoading ? "Choosing titles from your taste…" : undefined)}
      items={query.data?.picks}
      getKey={(pick) => `${pick.item.media_type}-${pick.item.id}`}
      renderItem={(pick) => <PickCard pick={pick} />}
      // A disabled query (signed out) is pending too, but has nothing to wait for.
      isPending={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}

export default AiPicksRow;
