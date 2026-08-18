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

export type TmdbMovieDetails = {
  releaseYear: string | null;
  cast: string[];
};

const CAST_LIMIT = 5;

// 상세 페이지 표시용(개봉 연도, 주요 출연진). 실패해도 페이지 전체가 깨지면 안 되므로 null을 반환한다.
export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
  try {
    const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
    url.searchParams.set("api_key", getApiKey());
    url.searchParams.set("language", "ko-KR");
    url.searchParams.set("append_to_response", "credits");

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;

    const data: {
      release_date?: string;
      credits?: { cast?: { name: string; order: number }[] };
    } = await res.json();

    const releaseYear = data.release_date ? data.release_date.slice(0, 4) : null;
    const cast = [...(data.credits?.cast ?? [])]
      .sort((a, b) => a.order - b.order)
      .slice(0, CAST_LIMIT)
      .map((member) => member.name);

    return { releaseYear, cast };
  } catch {
    return null;
  }
}
