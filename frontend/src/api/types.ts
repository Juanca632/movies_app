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

export interface PersonRef {
  id: number;
  name: string;
}

export interface CollectionRef {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface Collection extends CollectionRef {
  overview: string;
  parts: MediaSummary[]; // in release order, unreleased last
}

export interface Episode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null; // minutes
  still_path: string | null;
  vote_average: number;
}

export interface SeasonSummary {
  season_number: number; // 0 holds the specials
  name: string;
  air_date: string | null;
  episode_count: number;
  poster_path: string | null;
}

export interface Season extends SeasonSummary {
  overview: string;
  episodes: Episode[];
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

export interface CriticScore {
  source: "imdb" | "rotten_tomatoes" | "metacritic";
  value: string; // as displayed: "8.8", "86%", "74"
}

export interface Acclaim {
  awards: string | null;
  scores: CriticScore[];
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
  imdb_id: string | null;
  genres: Genre[];
  runtime: number | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  seasons: SeasonSummary[]; // TV only: regular seasons in order, specials last
  next_episode: Episode | null; // TV only, when one is scheduled
  creators: PersonRef[]; // directors of a movie, creators of a TV show
  cast: CastMember[];
  images: { backdrops: Image[]; posters: Image[] };
  providers: Providers | null;
  trailer: Video | null;
  recommendations: MediaSummary[];
  collection: CollectionRef | null; // movies only
}

export interface PersonSummary {
  id: number;
  media_type: "person";
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  known_for: string[]; // titles, most notable first
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
  // Behind the camera, movies and TV shows together.
  directed: MediaSummary[];
  created: MediaSummary[];
  written: MediaSummary[];
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
