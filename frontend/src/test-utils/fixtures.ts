import type { MediaDetail, MediaSummary, Page, PersonDetail, PersonSummary } from "../api/types";

export const media = (overrides: Partial<MediaSummary> = {}): MediaSummary => ({
  id: 1,
  media_type: "movie",
  title: "Inception",
  overview: "A thief who steals corporate secrets through dreams.",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  release_date: "2010-07-15",
  vote_average: 8.4,
  vote_count: 36000,
  genre_ids: [28],
  ...overrides,
});

export const mediaDetail = (overrides: Partial<MediaDetail> = {}): MediaDetail => ({
  ...media(),
  tagline: "Your mind is the scene of the crime.",
  status: "Released",
  homepage: null,
  original_language: "en",
  imdb_id: "tt1375666",
  genres: [
    { id: 28, name: "Action" },
    { id: 878, name: "Science Fiction" },
  ],
  runtime: 148,
  number_of_seasons: null,
  number_of_episodes: null,
  seasons: [],
  next_episode: null,
  creators: [{ id: 525, name: "Christopher Nolan" }],
  cast: [{ id: 6193, name: "Leonardo DiCaprio", character: "Cobb", profile_path: null }],
  images: { backdrops: [], posters: [] },
  providers: {
    region: "US",
    link: "https://www.themoviedb.org/movie/1/watch",
    flatrate: [
      { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.png" },
      { provider_id: 1796, provider_name: "Netflix basic with Ads", logo_path: "/netflix-ads.png" },
      { provider_id: 1899, provider_name: "HBO Max", logo_path: "/max.png" },
    ],
    rent: [],
    buy: [],
  },
  trailer: { key: "YoHD9XEInc0", name: "Official Trailer" },
  recommendations: [media({ id: 2, title: "Interstellar", release_date: "2014-11-05" })],
  collection: null,
  ...overrides,
});

export const person = (overrides: Partial<PersonSummary> = {}): PersonSummary => ({
  id: 31,
  media_type: "person",
  name: "Tom Hanks",
  profile_path: "/hanks.jpg",
  known_for_department: "Acting",
  known_for: ["Forrest Gump", "Toy Story"],
  popularity: 50,
  ...overrides,
});

export const personDetail = (overrides: Partial<PersonDetail> = {}): PersonDetail => ({
  ...person(),
  biography: "Thomas Jeffrey Hanks is an American actor. ".repeat(30),
  birthday: "1956-07-09",
  deathday: null,
  place_of_birth: "Concord, California, USA",
  also_known_as: [],
  movies: [media({ id: 13, title: "Forrest Gump", release_date: "1994-06-23" })],
  tv_shows: [],
  directed: [],
  created: [],
  written: [],
  ...overrides,
});

export const page = <T>(results: T[], overrides: Partial<Page<T>> = {}): Page<T> => ({
  page: 1,
  total_pages: 1,
  total_results: results.length,
  results,
  ...overrides,
});
