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
