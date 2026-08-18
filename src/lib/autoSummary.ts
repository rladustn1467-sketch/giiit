import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";
import type { Summary } from "@/generated/prisma/client";

function cleanSummaryText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

// 감상평이나 대화 중 하나라도 있어야 요약할 내용이 있다고 본다. 둘 다 없으면 null.
export async function generateAutoSummary(movieId: number): Promise<Summary | null> {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) return null;

  const conversations = await prisma.conversation.findMany({
    where: { movieId },
    orderBy: { createdAt: "asc" },
  });

  const hasUserMessage = conversations.some((c) => c.role === "user");
  const hasReview = Boolean(movie.review && movie.review.trim());

  if (!hasUserMessage && !hasReview) return null;

  const contextParts = [`영화 제목: ${movie.title}`];
  if (hasReview) {
    contextParts.push(`감상평: ${movie.review}`);
  }
  if (hasUserMessage) {
    const transcript = conversations
      .map((c) => `${c.role === "user" ? "사용자" : "AI"}: ${c.content}`)
      .join("\n");
    contextParts.push(`다음은 사용자와 AI가 이 영화에 대해 나눈 대화입니다.\n\n${transcript}`);
  }

  const context = `${contextParts.join("\n\n")}

위 내용에서 사용자의 핵심 반응/평가/감정을 아래 형식으로만 요약하세요. 다른 설명이나 대화체 문장은 절대 추가하지 마세요.

키워드1, 키워드2, 키워드3 · 한 줄 요약 문장

- 키워드는 본문에 등장한 단어(영화 제목, 등장인물, 소재 등)를 그대로 나열하지 마세요. 대신 사용자의 핵심 반응/평가/태도를 압축한 표현으로 바꾸세요.
  예: "지브리가 취향에 안 맞았다"는 내용이면 (지브리, 감상) 이 아니라 (취향아님, 기대이하) 처럼 쓰세요.
- 키워드 개수는 내용에서 실제로 드러나는 만큼만 쓰세요. 최소 개수 제한은 없고, 최대 4개를 넘지 마세요.
- 절대 규칙: 원문에 명시적으로 드러나지 않은 감정/반응을 지어내서 개수를 채우면 안 됩니다. 내용이 짧고 단순하면 키워드는 1개여도 됩니다.
  예: 감상평이 "귀여운 도리, 행복하자"처럼 짧으면 → 귀여움, 행복 (2개)까지만 쓰고, 원문에 없는 "감동"이나 "단순함" 같은 표현을 추가하지 마세요.
- 원문의 길이·문체·표현 방식에 대한 묘사(예: "단순함", "짧음", "간결함")는 사용자의 감정이 아니므로 키워드로 쓰지 마세요.
- 확신이 서지 않는 키워드는 차라리 빼세요. 개수를 채우는 것보다 정확한 게 훨씬 중요합니다.
- 뒤의 문장은 사용자를 3인칭으로 서술하는 짧은 문장 1개 (20~40자 내외)
- 위 한 줄 형식 그대로, 줄바꿈 없이 출력하세요`;

  const chatClient = getChatClient();
  const raw = await chatClient.sendMessage([], { tone: "normal", context, temperature: 0 });
  const summaryText = cleanSummaryText(raw);

  return prisma.summary.create({ data: { movieId, summaryText } });
}
