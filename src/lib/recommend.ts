import type { WatchProvider } from "./tmdb";

// 추천 이유가 실제로 어디서 왔는지: 사용자가 남긴 감상평 / AI 챗봇과의 대화 요약 / 단순 장르·성향 유사성.
export type ReasonBasis = "review" | "chat" | "genre";

const REASON_BASIS_VALUES: ReasonBasis[] = ["review", "chat", "genre"];

export function isReasonBasis(value: unknown): value is ReasonBasis {
  return typeof value === "string" && (REASON_BASIS_VALUES as string[]).includes(value);
}

export const REASON_BASIS_LABELS: Record<ReasonBasis, string> = {
  review: "감상평 기반",
  chat: "챗봇 기반",
  genre: "장르 유사",
};

export type RecommendationCard = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  reasonBasis: ReasonBasis;
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
  reasonBasis: string | null;
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
    reasonBasis: isReasonBasis(row.reasonBasis) ? row.reasonBasis : "genre",
    genres: parseJsonArray<string>(row.genresJson),
    watchProviders: parseJsonArray<WatchProvider>(row.watchProvidersJson),
  };
}
