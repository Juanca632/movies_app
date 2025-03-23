import { create } from "zustand";

interface MovieType {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
}

interface MovieStore {
  moviesStored: MovieType[];
  setMoviesStored: (movies: MovieType[]) => void;
}

export const useMovieStore = create<MovieStore>((set) => ({
  moviesStored: [],
  setMoviesStored: (moviesStored) => set({ moviesStored }),
}));
