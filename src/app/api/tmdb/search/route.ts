import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchMovies(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB search error:", error);
    return NextResponse.json(
      { error: "TMDB 검색에 실패했습니다." },
      { status: 502 }
    );
  }
}
