import type { UseQueryResult } from "@tanstack/react-query";
import { useMediaList, usePopularPeople } from "../api/queries";
import type { CastMember, Category, MediaSummary, MediaType, PersonSummary } from "../api/types";
import { personSubtitle } from "../lib/tmdb";
import { MediaCard, PersonCard } from "./cards";
import Row from "./Row";

interface MediaRowProps {
  title: string;
  items: MediaSummary[] | undefined;
  query?: Pick<UseQueryResult, "isPending" | "isError" | "refetch">;
}

export function MediaRow({ title, items, query }: MediaRowProps) {
  return (
    <Row
      title={title}
      items={items}
      getKey={(item) => `${item.media_type}-${item.id}`}
      renderItem={(item) => <MediaCard item={item} />}
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
