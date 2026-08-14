import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({
    where: { id: Number(id) },
  });

  if (!movie) {
    return NextResponse.json({ error: "영화를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ movie });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = Number(id);

  const existing = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!existing) {
    return NextResponse.json({ error: "영화를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { rating, review } = body as { rating?: number | null; review?: string | null };

  if (rating != null && (typeof rating !== "number" || rating < 0 || rating > 5)) {
    return NextResponse.json({ error: "평점은 0~5 사이여야 합니다." }, { status: 400 });
  }

  const movie = await prisma.movie.update({
    where: { id: movieId },
    data: {
      rating: rating === undefined ? existing.rating : rating,
      review: review === undefined ? existing.review : review,
    },
  });

  return NextResponse.json({ movie });
}
