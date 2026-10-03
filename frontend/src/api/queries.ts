import { keepPreviousData, QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegion } from "../lib/region";
import { API_URL, ApiError, getJson, sendJson } from "./client";
import type {
  Account,
  Acclaim,
  Category,
  Collection,
  DiscoverFilters,
  ForYou,
  Genre,
  ListKind,
  MediaDetail,
  MediaSummary,
  MediaType,
  Page,
  PersonDetail,
  PersonSummary,
  Profile,
  Provider,
  Region,
  ReleaseKind,
  SavedTitle,
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

/** A month's releases ("2026-10"); movies are dated in the user's country, TV worldwide. */
export const useReleases = (kind: ReleaseKind, month: string) => {
  const userRegion = useRegion();
  const region = kind === "tv" ? null : userRegion;
  return useQuery({
    queryKey: ["releases", kind, month, region],
    queryFn: ({ signal }) =>
      getJson<MediaSummary[]>(`releases/${kind}?month=${month}${region ? `&region=${region}` : ""}`, signal),
  });
};

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

// Accounts. /me answers 401 when signed out and 503 when the server has no accounts set up;
// anything else going wrong also just hides sign-in, the rest of the app does not need it.
const ACCOUNT_KEY = ["me"] as const;
const listKey = (kind: ListKind) => ["me", kind] as const;
const FOR_YOU_KEY = ["me", "for-you"] as const;

async function fetchAccount(signal: AbortSignal): Promise<Account> {
  try {
    return { status: "signed-in", profile: await getJson<Profile>("me", signal) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: "signed-out" };
    return { status: "unavailable" };
  }
}

export const useAccount = () =>
  useQuery({ queryKey: ACCOUNT_KEY, queryFn: ({ signal }) => fetchAccount(signal), staleTime: 30 * 60_000 });

/** Google sign-in is a full-page trip through the backend; it comes back to `next`. */
export const signInUrl = (next: string) => `${API_URL}/auth/google/login?next=${encodeURIComponent(next)}`;

export const useSavedList = (kind: ListKind) => {
  const { data: account } = useAccount();
  return useQuery({
    queryKey: listKey(kind),
    queryFn: ({ signal }) => getJson<SavedTitle[]>(`me/${kind}`, signal),
    enabled: account?.status === "signed-in",
  });
};

/** Add or remove a title from a list. The list updates at once and rolls back if the save fails. */
export const useToggleSaved = (kind: ListKind) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, save }: { item: SavedTitle; save: boolean }) =>
      sendJson<SavedTitle>(save ? "PUT" : "DELETE", `me/${kind}/${item.media_type}/${item.id}`),
    onMutate: async ({ item, save }) => {
      await queryClient.cancelQueries({ queryKey: listKey(kind) });
      const previous = queryClient.getQueryData<SavedTitle[]>(listKey(kind));
      const others = (previous ?? []).filter((t) => !(t.id === item.id && t.media_type === item.media_type));
      queryClient.setQueryData(listKey(kind), save ? [item, ...others] : others);
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(listKey(kind), context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey(kind) });
      queryClient.invalidateQueries({ queryKey: FOR_YOU_KEY });
    },
  });
};

/** Recommendations from the user's lists; only asked for once they have saved something. */
export const useForYou = () => {
  const favorites = useSavedList("favorite");
  const watchlist = useSavedList("watchlist");
  const hasSaved = Boolean(favorites.data?.length || watchlist.data?.length);
  return useQuery({
    queryKey: FOR_YOU_KEY,
    queryFn: ({ signal }) => getJson<ForYou>("me/recommendations", signal),
    enabled: hasSaved,
  });
};

const useEndSession = (request: () => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["me"], exact: false });
      queryClient.setQueryData<Account>(ACCOUNT_KEY, { status: "signed-out" });
    },
  });
};

export const useSignOut = () => useEndSession(() => sendJson("POST", "auth/logout"));

/** Deletes the account with its lists, for good; the browser ends up signed out. */
export const useDeleteAccount = () => useEndSession(() => sendJson("DELETE", "me"));
