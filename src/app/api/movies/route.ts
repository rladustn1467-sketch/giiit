import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { generateAutoSummary } from "@/lib/autoSummary";

// 감상평 입력 시 등록과 함께 요약(키워드)도 생성한다. Ollama 응답이 느릴 수 있어
// 서버리스 함수 제한 시간을 최대로 요청한다 (Vercel Hobby 상한 60초).
export const maxDuration = 60;

const SORT_FIELDS = ["watchedDate", "rating", "title", "createdAt"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSort(searchParams: URLSearchParams): Prisma.MovieOrderByWithRelationInput {
  const sortParam = searchParams.get("sort");
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const field: SortField = SORT_FIELDS.includes(sortParam as SortField)
    ? (sortParam as SortField)
    : "watchedDate";

  return { [field]: order };
}

export async function GET(request: NextRequest) {
  const orderBy = parseSort(request.nextUrl.searchParams);

  const movies = await prisma.movie.findMany({
    orderBy,
  });

  return NextResponse.json({ movies });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tmdbId, title, posterPath, overview, watchedDate, rating, review } = body;

  if (!tmdbId || !title || !watchedDate) {
    return NextResponse.json(
      { error: "tmdbId, title, watchedDate는 필수입니다." },
      { status: 400 }
    );
  }

  const movie = await prisma.movie.create({
    data: {
      tmdbId,
      title,
      posterPath: posterPath ?? null,
      overview: overview ?? null,
      watchedDate: new Date(watchedDate),
      rating: rating != null ? Number(rating) : null,
      review: review ?? null,
    },
  });

  try {
    await generateAutoSummary(movie.id);
  } catch {
    // 요약 생성 실패가 영화 등록 자체를 막지는 않는다.
  }

  return NextResponse.json({ movie }, { status: 201 });
}
