import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";
import { searchMovies, getWatchProviders, getGenres } from "@/lib/tmdb";
import { isReasonBasis, type RecommendationCard, type ReasonBasis } from "@/lib/recommend";

// Ollama 응답이 느릴 수 있어 서버리스 함수 제한 시간을 최대로 요청한다 (Vercel Hobby 상한 60초).
export const maxDuration = 60;

const USER_ID = 1;
const MIN_MOVIES = 3;
const RECOMMEND_COUNT = 5;
// 로컬 소형 모델은 존재하지 않는 영화 제목을 지어내는 경우가 잦아 TMDB 매칭에 실패하는 항목이 나온다.
// 필요한 개수보다 넉넉히 요청해서 매칭 실패를 상쇄하고, 그래도 부족하면 한 번 더 시도한다.
const REQUEST_COUNT = 8;
const MAX_ATTEMPTS = 2;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

type MovieForTaste = {
  title: string;
  rating: number | null;
  review: string | null;
  summaries: { summaryText: string }[];
};

// 평점 내림차순으로 정렬된 목록을 그대로 순서대로 텍스트화하므로, 목록 위쪽일수록 취향에 더 강하게 반영된다.
function buildTasteProfileText(movie: MovieForTaste): string {
  const lines = [`- 제목:"${movie.title}" 평점:${movie.rating ?? "없음"}`];
  if (movie.review) {
    lines.push(`  감상평: ${truncate(movie.review, 200)}`);
  }
  const latestSummary = movie.summaries[0]?.summaryText;
  if (latestSummary) {
    lines.push(`  요약: ${truncate(latestSummary, 200)}`);
  }
  return lines.join("\n");
}

type AiRecommendation = {
  title: string;
  originalTitle: string;
  year: string;
  reasonBasis: ReasonBasis;
  reason: string;
};

function extractJsonBlock(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  }
  return raw.slice(start, end + 1);
}

function parseRecommendResponse(raw: string): AiRecommendation[] {
  const parsed: unknown = JSON.parse(extractJsonBlock(raw));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { recommendations?: unknown }).recommendations)
  ) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  return (parsed as { recommendations: unknown[] }).recommendations
    .map((r) => {
      if (typeof r !== "object" || r === null) return null;
      const title = String((r as { title?: unknown }).title ?? "").trim();
      if (!title) return null;
      const originalTitle = String((r as { originalTitle?: unknown }).originalTitle ?? "").trim();
      const year = String((r as { year?: unknown }).year ?? "").trim();
      const reason = String((r as { reason?: unknown }).reason ?? "").trim();
      const rawBasis = (r as { reasonBasis?: unknown }).reasonBasis;
      const reasonBasis: ReasonBasis = isReasonBasis(rawBasis) ? rawBasis : "genre";
      return { title, originalTitle, year, reasonBasis, reason };
    })
    .filter((r): r is AiRecommendation => r !== null);
}

type ResolvedCandidate = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reasonBasis: ReasonBasis;
  reason: string;
};

// AI가 추천한 제목을 TMDB에서 찾아 포스터/줄거리를 붙인다. 소형 로컬 모델은 실존하지 않는 제목을
// 지어내는 경우가 있어, 한글 제목으로 못 찾으면 원제로 한 번 더 시도한다. 그래도 없거나 이미
// 등록된 영화면 null을 반환한다.
async function resolveRecommendation(
  rec: AiRecommendation,
  excludeTmdbIds: Set<number>
): Promise<ResolvedCandidate | null> {
  try {
    // 줄거리나 개봉일이 없는 항목은 팬메이드 영상 등 정식 영화가 아닐 가능성이 커서 제외한다.
    const isRealMovie = (m: { overview: string; releaseDate: string }) =>
      m.overview.trim() !== "" && m.releaseDate.trim() !== "";

    let results = (await searchMovies(rec.title)).filter(isRealMovie);
    if (results.length === 0 && rec.originalTitle) {
      results = (await searchMovies(rec.originalTitle)).filter(isRealMovie);
    }
    const match = rec.year
      ? results.find((m) => m.releaseDate.startsWith(rec.year)) ?? results[0]
      : results[0];
    if (!match || excludeTmdbIds.has(match.id)) return null;

    return {
      tmdbId: match.id,
      title: match.title,
      releaseYear: match.releaseDate ? match.releaseDate.slice(0, 4) : null,
      overview: match.overview,
      posterPath: match.posterPath,
      reasonBasis: rec.reasonBasis,
      reason: rec.reason,
    };
  } catch {
    return null;
  }
}

export async function POST() {
  const movies = await prisma.movie.findMany({
    where: { userId: USER_ID },
    orderBy: { rating: "desc" },
    include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (movies.length < MIN_MOVIES) {
    return NextResponse.json(
      { error: `추천을 받으려면 최소 ${MIN_MOVIES}편의 영화를 등록해야 합니다.` },
      { status: 400 }
    );
  }

  const profiles = movies.map(buildTasteProfileText);

  const context = `당신은 사용자의 영화 감상 데이터를 분석해서 아직 보지 않은 영화를 추천하는 영화 추천 도우미입니다.

다음은 사용자가 지금까지 등록한 영화 ${movies.length}편의 데이터입니다. 평점이 높은 영화(목록 위쪽)일수록 사용자의 취향을 강하게 반영하니 우선적으로 참고하고, 평점이 낮거나 없는 영화는 보조적으로만 참고하세요.

${profiles.join("\n\n")}

[추천 규칙]
1. 위 목록에서 드러나는 장르, 분위기, 연출 성향 등 취향을 분석하세요.
2. 위 목록에 있는 영화는 절대 다시 추천하지 마세요.
3. 반드시 실제로 개봉된 영화만 추천하세요. 존재하지 않는 제목을 지어내면 절대 안 됩니다. 확신이 서지 않는 제목은 포함하지 마세요.
4. 정확히 ${REQUEST_COUNT}편을 추천하세요.
5. reason은 추천하는 영화 자체의 줄거리를 요약하면 안 됩니다. 대신 위 목록 중 어떤 영화의 "감상평" 또는 "요약" 항목의 어떤 부분이 이 추천의 근거가 됐는지, 그 영화 제목을 언급하며 구체적으로 설명하세요.
6. 각 추천마다 근거가 다음 중 무엇인지 reasonBasis 필드에 정확히 밝히세요.
   - "review": 위 목록의 특정 영화에 사용자가 직접 남긴 "감상평:" 내용이 근거일 때
   - "chat": 위 목록의 특정 영화에 대해 AI 챗봇과 나눈 "요약:" 내용이 근거일 때
   - "genre": 특정 감상평/요약을 근거로 들 수 없고, 장르나 전반적인 취향 성향의 유사성만으로 추천할 때 (이때는 reason에서도 특정 영화를 지목하지 말고 장르/성향 유사성을 설명하세요)
7. reason에는 마크다운, 별표(**) 등 서식 문자를 절대 포함하지 말고 순수 텍스트 한 문장으로만 작성하세요.

[출력 형식]
아래 JSON 형식으로만 응답하세요. originalTitle은 영화의 원제(영어 등 원어 제목)이고, reasonBasis는 반드시 "review", "chat", "genre" 중 하나입니다. 설명, 마크다운 코드블록, 다른 텍스트는 절대 포함하지 마세요.
{"recommendations":[{"title":"한글 제목","originalTitle":"원제","year":"개봉연도(YYYY, 모르면 빈 문자열)","reasonBasis":"review|chat|genre","reason":"추천 이유 한 문장"}]}`;

  const chatClient = getChatClient();
  const excludeTmdbIds = new Set(movies.map((m) => m.tmdbId));
  const collected: ResolvedCandidate[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS && collected.length < RECOMMEND_COUNT; attempt++) {
    const raw = await chatClient.sendMessage([], { tone: "normal", context, temperature: 0.9 });

    let aiRecommendations: AiRecommendation[];
    try {
      aiRecommendations = parseRecommendResponse(raw);
    } catch {
      continue;
    }

    const resolved = await Promise.all(
      aiRecommendations.map((rec) => resolveRecommendation(rec, excludeTmdbIds))
    );
    for (const card of resolved) {
      if (!card || collected.length >= RECOMMEND_COUNT) continue;
      if (excludeTmdbIds.has(card.tmdbId)) continue; // 같은 배치 내 중복 추천 방지
      excludeTmdbIds.add(card.tmdbId);
      collected.push(card);
    }
  }

  if (collected.length === 0) {
    return NextResponse.json(
      { error: "추천 결과를 생성하지 못했습니다. 다시 시도해주세요." },
      { status: 502 }
    );
  }

  const recommendations: RecommendationCard[] = await Promise.all(
    collected.map(async (candidate) => ({
      ...candidate,
      genres: await getGenres(candidate.tmdbId),
      watchProviders: await getWatchProviders(candidate.tmdbId),
    }))
  );

  // "다시 추천받기"를 누를 때만 이 라우트가 호출되므로, 기존 추천을 통째로 지우고 새로 저장한다.
  // 페이지는 새로고침 시 이 테이블을 그대로 읽어서 보여준다.
  await prisma.$transaction([
    prisma.recommendation.deleteMany({ where: { userId: USER_ID } }),
    prisma.recommendation.createMany({
      data: recommendations.map((r) => ({
        userId: USER_ID,
        tmdbId: r.tmdbId,
        title: r.title,
        releaseYear: r.releaseYear,
        overview: r.overview,
        posterPath: r.posterPath,
        reason: r.reason,
        reasonBasis: r.reasonBasis,
        genresJson: JSON.stringify(r.genres),
        watchProvidersJson: JSON.stringify(r.watchProviders),
      })),
    }),
  ]);

  return NextResponse.json({ recommendations });
}
