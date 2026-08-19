import type { WatchProvider } from "./tmdb";

export type RecommendationCard = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  watchProviders: WatchProvider[];
};

type RecommendationRow = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  watchProvidersJson: string;
};

// DB에 저장된 행을 카드 형태로 되돌린다. watchProvidersJson 파싱에 실패해도 카드 자체는 보여줘야 하므로 빈 배열로 대체한다.
export function mapRecommendationRow(row: RecommendationRow): RecommendationCard {
  let watchProviders: WatchProvider[] = [];
  try {
    watchProviders = JSON.parse(row.watchProvidersJson);
  } catch {
    watchProviders = [];
  }

  return {
    tmdbId: row.tmdbId,
    title: row.title,
    releaseYear: row.releaseYear,
    overview: row.overview,
    posterPath: row.posterPath,
    reason: row.reason,
    watchProviders,
  };
}
