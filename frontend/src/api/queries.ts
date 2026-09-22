import { keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { ApiError, getJson } from "./client";
import type {
  Category,
  MediaDetail,
  MediaSummary,
  MediaType,
  Page,
  PersonDetail,
  PersonSummary,
  SearchResult,
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

export const useMediaList = <M extends MediaType>(mediaType: M, category: Category<M>) =>
  useQuery({
    queryKey: ["media", mediaType, category],
    queryFn: ({ signal }) => getJson<Page<MediaSummary>>(`${mediaType}?category=${category}`, signal),
    select: (page) => page.results,
  });

export const useMediaDetail = (mediaType: MediaType, id: string) =>
  useQuery({
    queryKey: ["media", mediaType, "detail", id],
    queryFn: ({ signal }) => getJson<MediaDetail>(`${mediaType}/${id}`, signal),
  });

export const useTrendingPeople = () =>
  useQuery({
    queryKey: ["person", "trending"],
    queryFn: ({ signal }) => getJson<Page<PersonSummary>>("person/trending", signal),
    select: (page) => page.results,
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
