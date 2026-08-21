export type GenreStat = {
  genre: string;
  count: number;
  avgRating: number | null;
};

export type RatingBucket = {
  label: string;
  count: number;
};

export type RatingStats = {
  average: number | null;
  count: number;
  distribution: RatingBucket[];
};

export type TasteAnalysisResult = {
  movieCount: number;
  genreStats: GenreStat[];
  ratingStats: RatingStats;
  reviewSummary: string;
};

type TasteAnalysisRow = {
  movieCount: number;
  genreStatsJson: string;
  ratingStatsJson: string;
  reviewSummary: string;
};

export function mapTasteAnalysisRow(row: TasteAnalysisRow): TasteAnalysisResult {
  return {
    movieCount: row.movieCount,
    genreStats: JSON.parse(row.genreStatsJson) as GenreStat[],
    ratingStats: JSON.parse(row.ratingStatsJson) as RatingStats,
    reviewSummary: row.reviewSummary,
  };
}
