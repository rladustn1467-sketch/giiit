import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAutoSummary } from "@/lib/autoSummary";

// Ollama 응답이 느릴 수 있어 서버리스 함수 제한 시간을 최대로 요청한다 (Vercel Hobby 상한 60초).
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = Number(id);

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "영화를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const force = Boolean((body as { force?: boolean })?.force);

  if (!force) {
    const existing = await prisma.summary.findFirst({
      where: { movieId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return NextResponse.json({ summary: existing, skipped: true });
    }
  }

  const summary = await generateAutoSummary(movieId);
  if (!summary) {
    return NextResponse.json(
      { summary: null, error: "감상평이나 대화가 있어야 요약할 수 있어요." },
      { status: 422 }
    );
  }

  return NextResponse.json({ summary });
}
