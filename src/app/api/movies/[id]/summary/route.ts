import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const summary = await prisma.summary.findFirst({
    where: { movieId: Number(id) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ summary });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = Number(id);

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "영화를 찾을 수 없습니다." }, { status: 404 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { movieId },
    orderBy: { createdAt: "asc" },
  });

  if (conversations.length === 0) {
    return NextResponse.json(
      { error: "요약할 대화가 없습니다. 먼저 AI와 대화를 나눠보세요." },
      { status: 400 }
    );
  }

  const transcript = conversations
    .map((c) => `${c.role === "user" ? "사용자" : "AI"}: ${c.content}`)
    .join("\n");

  const context = `영화 제목: ${movie.title}

다음은 사용자와 AI가 이 영화에 대해 나눈 대화입니다.

${transcript}

위 대화를 참고해서 사용자가 이 영화에 대해 느낀 생각과 감정을 3~5문장으로 요약해주세요. 대화체가 아니라 요약문 형태로, 사용자를 3인칭으로 서술해주세요.`;

  const chatClient = getChatClient();
  const summaryText = await chatClient.sendMessage([], { tone: "normal", context });

  const summary = await prisma.summary.create({
    data: { movieId, summaryText },
  });

  return NextResponse.json({ summary });
}
