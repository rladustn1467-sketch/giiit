import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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

  return NextResponse.json({ movie }, { status: 201 });
}
