import type { UseQueryResult } from "@tanstack/react-query";
import { useForYou, useMediaList, usePopularPeople } from "../api/queries";
import type { CastMember, Category, MediaSummary, MediaType, PersonSummary } from "../api/types";
import { personSubtitle } from "../lib/tmdb";
import { MediaCard, PersonCard } from "./cards";
import Row from "./Row";

interface MediaRowProps {
  title: string;
  description?: string;
  items: MediaSummary[] | undefined;
  /** Highlights this title, e.g. the movie whose page lists its saga. */
  currentId?: number;
  query?: Pick<UseQueryResult, "isPending" | "isError" | "refetch">;
}

export function MediaRow({ title, description, items, currentId, query }: MediaRowProps) {
  return (
    <Row
      title={title}
      description={description}
      items={items}
      getKey={(item) => `${item.media_type}-${item.id}`}
      renderItem={(item) => <MediaCard item={item} current={item.id === currentId} />}
      isPending={query?.isPending}
      isError={query?.isError}
      onRetry={() => query?.refetch()}
    />
  );
}

export function CategoryRow<M extends MediaType>({ title, mediaType, category }: { title: string; mediaType: M; category: Category<M> }) {
  const query = useMediaList(mediaType, category);
  return <MediaRow title={title} items={query.data} query={query} />;
}

export function CastRow({ cast }: { cast: CastMember[] }) {
  return (
    <Row
      title="Cast"
      variant="person"
      items={cast}
      getKey={(member) => member.id}
      renderItem={(member) => (
        <PersonCard id={member.id} name={member.name} profilePath={member.profile_path} subtitle={member.character} />
      )}
    />
  );
}

export function PopularPeopleRow({ title }: { title: string }) {
  const query = usePopularPeople();
  return (
    <Row<PersonSummary>
      title={title}
      variant="person"
      items={query.data}
      getKey={(person) => person.id}
      renderItem={(person) => (
        <PersonCard id={person.id} name={person.name} profilePath={person.profile_path} subtitle={personSubtitle(person)} />
      )}
      isPending={query.isPending}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
}

/** The signed-in user's top picks, from everything they saved; nothing until they save a title. */
export function TopPicksRow() {
  const query = useForYou();
  return (
    <MediaRow
      title="Top Picks for You"
      description="Based on your favorites and your list"
      items={query.data?.picks}
      // A disabled query (signed out, nothing saved) is pending too, but has nothing to wait for.
      query={{ ...query, isPending: query.isLoading }}
    />
  );
}

/** One row per recent favourite, Netflix style. */
export function BecauseYouLikedRows() {
  const { data } = useForYou();
  return data?.because.map((row) => (
    <MediaRow key={`${row.source.media_type}-${row.source.id}`} title={`Because You Liked ${row.source.title}`} items={row.results} />
  ));
}
