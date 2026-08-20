import type { WatchProvider } from "./tmdb";

export type RecommendationCard = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  genres: string[];
  watchProviders: WatchProvider[];
};

type RecommendationRow = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  genresJson: string | null;
  watchProvidersJson: string;
};

function parseJsonArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// DB에 저장된 행을 카드 형태로 되돌린다. JSON 파싱에 실패해도 카드 자체는 보여줘야 하므로 빈 배열로 대체한다.
export function mapRecommendationRow(row: RecommendationRow): RecommendationCard {
  return {
    tmdbId: row.tmdbId,
    title: row.title,
    releaseYear: row.releaseYear,
    overview: row.overview,
    posterPath: row.posterPath,
    reason: row.reason,
    genres: parseJsonArray<string>(row.genresJson),
    watchProviders: parseJsonArray<WatchProvider>(row.watchProvidersJson),
  };
}
