import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";
import { getGenres } from "@/lib/tmdb";
import type { GenreStat, RatingBucket, RatingStats, TasteAnalysisResult } from "@/lib/taste";

export const maxDuration = 60;

const USER_ID = 1;
const MIN_MOVIES = 3;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function buildRatingStats(ratings: number[]): RatingStats {
  if (ratings.length === 0) {
    return { average: null, count: 0, distribution: [] };
  }
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  const buckets = new Map<number, number>();
  for (const r of ratings) {
    const bucket = Math.min(5, Math.max(1, Math.round(r)));
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const distribution: RatingBucket[] = [5, 4, 3, 2, 1].map((n) => ({
    label: `${n}점`,
    count: buckets.get(n) ?? 0,
  }));

  return { average, count: ratings.length, distribution };
}

async function buildGenreStats(
  movies: { tmdbId: number; rating: number | null }[]
): Promise<GenreStat[]> {
  const genresByMovie = await Promise.all(
    movies.map(async (m) => ({ rating: m.rating, genres: await getGenres(m.tmdbId) }))
  );

  const stats = new Map<string, { count: number; ratingSum: number; ratingCount: number }>();
  for (const { rating, genres } of genresByMovie) {
    for (const genre of genres) {
      const entry = stats.get(genre) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
      entry.count += 1;
      if (rating != null) {
        entry.ratingSum += rating;
        entry.ratingCount += 1;
      }
      stats.set(genre, entry);
    }
  }

  return [...stats.entries()]
    .map(([genre, { count, ratingSum, ratingCount }]) => ({
      genre,
      count,
      avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
    }))
    .sort((a, b) => b.count - a.count);
}

// 감상평/평점만 근거로 사용한다. 챗봇 대화 요약(Summary)은 지금 단계에서는 의도적으로 제외한다.
function buildReviewProfileText(movie: { title: string; rating: number | null; review: string | null }): string | null {
  if (!movie.review) return null;
  return `- 제목:"${movie.title}" 평점:${movie.rating ?? "없음"}\n  감상평: ${truncate(movie.review, 200)}`;
}

export async function POST() {
  const movies = await prisma.movie.findMany({
    where: { userId: USER_ID },
    orderBy: { watchedDate: "desc" },
  });

  if (movies.length < MIN_MOVIES) {
    return NextResponse.json(
      { error: `취향 분석을 받으려면 최소 ${MIN_MOVIES}편의 영화를 등록해야 합니다.` },
      { status: 400 }
    );
  }

  const ratings = movies.map((m) => m.rating).filter((r): r is number => r != null);
  const ratingStats = buildRatingStats(ratings);
  const genreStats = await buildGenreStats(movies.map((m) => ({ tmdbId: m.tmdbId, rating: m.rating })));

  const reviewProfiles = movies.map(buildReviewProfileText).filter((p): p is string => p !== null);

  const context = `당신은 사용자의 영화 취향을 분석하는 다정한 친구입니다. 아래는 사용자가 등록한 영화 중 감상평을 남긴 ${reviewProfiles.length}편의 데이터(제목, 평점, 감상평)입니다. 평점이 높은 영화는 사용자가 좋아하는 요소로, 평점이 낮은 영화는 사용자가 꺼리는 요소로 참고하세요.

${reviewProfiles.join("\n\n")}

[분석 규칙]
1. 장르 이름을 단순 나열하지 말고, 감상평 문장에서 사용자가 실제로 어떤 요소(연출, 인물, 서사, 분위기, 메시지 등)에 반응했는지 구체적으로 짚어서 설명하세요.
2. 평점이 낮았거나 감상평이 부정적이었던 영화가 있다면, 그 특징도 함께 언급해서 사용자가 꺼리는 취향도 알려주세요.
3. 챗봇 대화 내용은 참고하지 말고, 오직 위에 주어진 평점과 감상평만 근거로 삼으세요.
4. 마치 취향을 잘 아는 친구가 옆에서 설명해주듯 자연스러운 대화체(해요체)로, 3~4문장 이내로 작성하세요.
5. 마크다운, 별표(**) 등 서식 문자는 절대 포함하지 마세요. 순수 텍스트로만 응답하세요.`;

  const chatClient = getChatClient();
  const reviewSummary =
    reviewProfiles.length > 0
      ? (await chatClient.sendMessage([], { tone: "normal", context, temperature: 0.7 })).trim()
      : "감상평을 남긴 영화가 아직 없어서 취향 요약을 만들 수 없어요. 감상평을 남겨보세요.";

  const result: TasteAnalysisResult = {
    movieCount: movies.length,
    genreStats,
    ratingStats,
    reviewSummary,
  };

  await prisma.$transaction([
    prisma.tasteAnalysis.deleteMany({ where: { userId: USER_ID } }),
    prisma.tasteAnalysis.create({
      data: {
        userId: USER_ID,
        movieCount: result.movieCount,
        genreStatsJson: JSON.stringify(result.genreStats),
        ratingStatsJson: JSON.stringify(result.ratingStats),
        reviewSummary: result.reviewSummary,
      },
    }),
  ]);

  return NextResponse.json(result);
}
