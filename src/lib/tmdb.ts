const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
export const TMDB_LOGO_BASE_URL = "https://image.tmdb.org/t/p/w92";

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

// 장르 이름 목록. 영화 상세 조회(append_to_response 없이)만으로도 genres 필드가 기본 포함된다.
export async function getGenres(tmdbId: number): Promise<string[]> {
  try {
    const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
    url.searchParams.set("api_key", getApiKey());
    url.searchParams.set("language", "ko-KR");

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return [];

    const data: { genres?: { name: string }[] } = await res.json();
    return (data.genres ?? []).map((g) => g.name);
  } catch {
    return [];
  }
}

export type WatchProvider = {
  providerId: number;
  providerName: string;
  logoPath: string;
};

type TmdbWatchProviderEntry = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
};

// 한국(KR) 리전에서 볼 수 있는 스트리밍/대여/구매 서비스 목록을 우선순위(display_priority)순으로 합쳐서 반환한다.
// TMDB의 이 데이터는 JustWatch가 제공하므로, 화면에 노출할 때는 출처(Powered by JustWatch)를 함께 표기해야 한다.
export async function getWatchProviders(tmdbId: number): Promise<WatchProvider[]> {
  try {
    const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}/watch/providers`);
    url.searchParams.set("api_key", getApiKey());

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return [];

    const data: {
      results?: Record<
        string,
        { flatrate?: TmdbWatchProviderEntry[]; rent?: TmdbWatchProviderEntry[]; buy?: TmdbWatchProviderEntry[] }
      >;
    } = await res.json();

    const kr = data.results?.KR;
    if (!kr) return [];

    const merged = [...(kr.flatrate ?? []), ...(kr.rent ?? []), ...(kr.buy ?? [])];
    const byProviderId = new Map<number, TmdbWatchProviderEntry>();
    for (const entry of merged) {
      if (!byProviderId.has(entry.provider_id)) {
        byProviderId.set(entry.provider_id, entry);
      }
    }

    return [...byProviderId.values()]
      .sort((a, b) => a.display_priority - b.display_priority)
      .map((entry) => ({
        providerId: entry.provider_id,
        providerName: entry.provider_name,
        logoPath: entry.logo_path,
      }));
  } catch {
    return [];
  }
}
