import { keepPreviousData, QueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRegion } from "../lib/region";
import { ApiError, getJson } from "./client";
import type {
  Acclaim,
  Category,
  Collection,
  DiscoverFilters,
  Genre,
  MediaDetail,
  MediaSummary,
  MediaType,
  Page,
  PersonDetail,
  PersonSummary,
  Provider,
  Region,
  SearchResult,
  Season,
} from "./types";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // A 4xx will not fix itself; network errors and 5xx get a couple of retries.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
}

// Lists that depend on local release dates; the rest are the same everywhere.
const REGIONAL_CATEGORIES: readonly string[] = ["now_playing", "upcoming"];

// Genres, countries and services barely change; one fetch per session is plenty.
const STATIC = { staleTime: Infinity, gcTime: Infinity } as const;

export const useMediaList = <M extends MediaType>(mediaType: M, category: Category<M>) => {
  const userRegion = useRegion();
  const region = mediaType === "movie" && REGIONAL_CATEGORIES.includes(category) ? userRegion : null;
  return useQuery({
    queryKey: ["media", mediaType, category, region],
    queryFn: ({ signal }) =>
      getJson<Page<MediaSummary>>(`${mediaType}?category=${category}${region ? `&region=${region}` : ""}`, signal),
    select: (page) => page.results,
  });
};

export const useMediaDetail = (mediaType: MediaType, id: string, enabled = true) => {
  const region = useRegion();
  return useQuery({
    enabled,
    queryKey: ["media", mediaType, "detail", id, region],
    queryFn: ({ signal }) => getJson<MediaDetail>(`${mediaType}/${id}?region=${region}`, signal),
    // Switching country only changes the providers; keep the page on screen meanwhile.
    placeholderData: (previous, query) => (query?.queryKey[3] === id ? previous : undefined),
  });
};

export const useSeason = (tvId: number, seasonNumber: number | null) =>
  useQuery({
    queryKey: ["media", "tv", tvId, "season", seasonNumber],
    queryFn: ({ signal }) => getJson<Season>(`tv/${tvId}/season/${seasonNumber}`, signal),
    enabled: seasonNumber !== null,
  });

export const useCollection = (id: number | null) =>
  useQuery({
    queryKey: ["collection", id],
    queryFn: ({ signal }) => getJson<Collection>(`collection/${id}`, signal),
    enabled: id !== null,
  });

export const useAcclaim = (imdbId: string | null) =>
  useQuery({
    queryKey: ["acclaim", imdbId],
    queryFn: ({ signal }) => getJson<Acclaim>(`acclaim/${imdbId}`, signal),
    enabled: Boolean(imdbId),
    ...STATIC,
  });

export const useGenres = (mediaType: MediaType) =>
  useQuery({
    queryKey: ["genres", mediaType],
    queryFn: ({ signal }) => getJson<Genre[]>(`genres/${mediaType}`, signal),
    ...STATIC,
  });

export const useRegions = () =>
  useQuery({
    queryKey: ["regions"],
    queryFn: ({ signal }) => getJson<Region[]>("regions", signal),
    ...STATIC,
  });

/** Country name for a code, falling back to the code until the list loads. */
export const useRegionName = (code: string) => {
  const { data } = useRegions();
  return data?.find((region) => region.code === code)?.name ?? code;
};

export const useProviders = (mediaType: MediaType, region: string) =>
  useQuery({
    queryKey: ["providers", mediaType, region],
    queryFn: ({ signal }) => getJson<Provider[]>(`providers/${mediaType}?region=${region}`, signal),
    ...STATIC,
  });

export const useDiscover = (mediaType: MediaType, filters: DiscoverFilters, region: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: ["discover", mediaType, filters, filters.provider ? region : null],
    queryFn: ({ signal, pageParam }) => {
      const params = new URLSearchParams({ sort: filters.sort, page: String(pageParam) });
      if (filters.genre) params.set("genre", String(filters.genre));
      if (filters.provider) {
        params.set("provider", String(filters.provider));
        params.set("region", region);
      }
      return getJson<Page<MediaSummary>>(`discover/${mediaType}?${params}`, signal);
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled,
  });

export const usePopularPeople = () =>
  useQuery({
    queryKey: ["person", "popular"],
    queryFn: ({ signal }) => getJson<PersonSummary[]>("person/popular", signal),
  });

export const usePerson = (id: string) =>
  useQuery({
    queryKey: ["person", id],
    queryFn: ({ signal }) => getJson<PersonDetail>(`person/${id}`, signal),
  });

export const useSearch = (query: string, page: number) =>
  useQuery({
    queryKey: ["search", query, page],
    queryFn: ({ signal }) =>
      getJson<Page<SearchResult>>(`search?q=${encodeURIComponent(query)}&page=${page}`, signal),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
