// Mirrors the response models in backend/app/schemas.

export type MediaType = "movie" | "tv";

export interface Page<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

export interface MediaSummary {
  id: number;
  media_type: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string | null;
  profile_path: string | null;
}

export interface Image {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface Video {
  key: string; // YouTube video id
  name: string;
}

export interface Region {
  code: string;
  name: string;
}

export interface Providers {
  region: string;
  link: string | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface MediaDetail extends MediaSummary {
  tagline: string;
  status: string | null;
  homepage: string | null;
  original_language: string | null;
  genres: Genre[];
  runtime: number | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  cast: CastMember[];
  images: { backdrops: Image[]; posters: Image[] };
  providers: Providers | null;
  trailer: Video | null;
  recommendations: MediaSummary[];
}

export interface PersonSummary {
  id: number;
  media_type: "person";
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  popularity: number;
}

export interface PersonDetail extends PersonSummary {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  also_known_as: string[];
  movies: MediaSummary[];
  tv_shows: MediaSummary[];
}

export type SearchResult = MediaSummary | PersonSummary;

export const MOVIE_CATEGORIES = ["popular", "top_rated", "upcoming", "now_playing"] as const;
export const TV_CATEGORIES = ["popular", "top_rated", "airing_today", "on_the_air"] as const;
export type Category<M extends MediaType> = M extends "movie"
  ? (typeof MOVIE_CATEGORIES)[number]
  : (typeof TV_CATEGORIES)[number];

export const DISCOVER_SORTS = ["popular", "top_rated", "newest"] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

export interface DiscoverFilters {
  genre: number | null;
  provider: number | null;
  sort: DiscoverSort;
}
