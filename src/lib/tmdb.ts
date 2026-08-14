const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set in the environment");
  }
  return key;
}

export type TmdbSearchResult = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
};

type TmdbApiMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
};

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ko-KR");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data: { results: TmdbApiMovie[] } = await res.json();

  return data.results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
  }));
}
