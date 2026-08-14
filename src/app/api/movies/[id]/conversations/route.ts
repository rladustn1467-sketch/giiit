import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";
import type { ChatMessage, ChatTone } from "@/lib/ai/chatClient";

type MovieForContext = {
  title: string;
  watchedDate: Date;
  rating: number | null;
  review: string | null;
  overview: string | null;
};

function buildMovieContext(movie: MovieForContext): string {
  const lines = [
    `영화 제목: ${movie.title}`,
    `감상일: ${movie.watchedDate.toLocaleDateString("ko-KR")}`,
  ];
  if (movie.rating != null) lines.push(`평점: ${movie.rating}/5`);
  if (movie.review) lines.push(`감상평: ${movie.review}`);
  if (movie.overview) lines.push(`줄거리: ${movie.overview}`);
  return lines.join("\n");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversations = await prisma.conversation.findMany({
    where: { movieId: Number(id) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ conversations });
}

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

  const body = await request.json();
  const tone: ChatTone = body.tone ?? "normal";
  const content: string | undefined = body.content;

  const existing = await prisma.conversation.findMany({
    where: { movieId },
    orderBy: { createdAt: "asc" },
  });

  const movieContext = buildMovieContext(movie);
  const chatClient = getChatClient();

  if (content) {
    await prisma.conversation.create({ data: { movieId, role: "user", content } });

    const history: ChatMessage[] = [
      ...existing.map((c) => ({
        role: c.role as ChatMessage["role"],
        content: c.content,
      })),
      { role: "user", content },
    ];

    const reply = await chatClient.sendMessage(history, { tone, context: movieContext });
    const assistantMessage = await prisma.conversation.create({
      data: { movieId, role: "assistant", content: reply },
    });

    return NextResponse.json({ assistantMessage });
  }

  if (existing.length > 0) {
    return NextResponse.json({ error: "content는 필수입니다." }, { status: 400 });
  }

  const hints: string[] = [];
  if (movie.rating != null) {
    hints.push(
      `사용자가 남긴 평점(${movie.rating}/5)에 주목해서, 왜 그런 점수를 줬는지, 무엇이 특히 좋았는지(또는 아쉬웠는지) 궁금해하는 질문`
    );
  }
  if (movie.review) {
    hints.push(`사용자가 남긴 감상평("${movie.review}")에서 더 깊이 파고들 만한 부분을 짚는 질문`);
  }
  const personalHint = hints.length > 0 ? ` 특히 ${hints.join(", 또는 ")}이면 좋습니다.` : "";

  const openingContext = `${movieContext}\n\n위 정보를 참고해서 사용자와 이 영화에 대해 이야기 나눌 흥미로운 질문을 하나만 자연스럽게 던지며 대화를 시작하세요.${personalHint}`;

  const reply = await chatClient.sendMessage([], { tone, context: openingContext });
  const assistantMessage = await prisma.conversation.create({
    data: { movieId, role: "assistant", content: reply },
  });

  return NextResponse.json({ assistantMessage });
}
