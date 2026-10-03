import { useAiPicks } from "../api/queries";
import { MediaCard } from "./cards";
import { AiSparkIcon } from "./icons";
import Row from "./Row";

/**
 * The AI's own picks from the signed-in user's lists, as plain cards like every other row; the
 * AI's intro says why. Made on the server without being asked and reused until the lists change,
 * so most loads cost nothing.
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
      renderItem={(pick) => <MediaCard item={pick.item} />}
      // A disabled query (signed out) is pending too, but has nothing to wait for.
      isPending={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}

export default AiPicksRow;
