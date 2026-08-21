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

  const userMessages = conversations.filter((c) => c.role === "user").map((c) => c.content);
  const assistantMessages = conversations.filter((c) => c.role === "assistant").map((c) => c.content);
  const hasUserChatMessage = userMessages.length > 0;
  const hasReview = Boolean(movie.review && movie.review.trim());

  if (!hasUserChatMessage && !hasReview) return null;

  // 근거 자료를 우선순위별로 분리해서 제공한다: 감상평(1순위) > 사용자가 직접 입력한 메시지(2순위) > AI 답변(보조 참고).
  // AI 답변에만 등장하는 영화적 요소가 키워드로 새어 들어가는 걸 막기 위해, AI 답변은 별도 블록으로 명확히 구분하고
  // "단독 근거로 쓰지 말 것"이라고 라벨을 붙인다.
  const contextParts = [`영화 제목: ${movie.title}`];
  if (hasReview) {
    contextParts.push(`[자료 1순위] 사용자의 감상평:\n${movie.review}`);
  }
  if (hasUserChatMessage) {
    contextParts.push(
      `[자료 2순위] 사용자가 챗봇에게 직접 입력한 메시지:\n${userMessages.map((m) => `- ${m}`).join("\n")}`
    );
  }
  if (assistantMessages.length > 0) {
    contextParts.push(
      `[보조 참고용 — 절대 단독 근거로 쓰지 말 것] AI 챗봇의 답변:\n${assistantMessages
        .map((m) => `- ${m}`)
        .join("\n")}`
    );
  }

  const context = `${contextParts.join("\n\n")}

위 자료를 근거로 사용자의 핵심 반응/평가를 아래 형식으로만 요약하세요. 다른 설명이나 대화체 문장은 절대 추가하지 마세요.

키워드1, 키워드2, 키워드3 · 한 줄 요약 문장

[근거 자료 우선순위]
1. "사용자의 감상평"을 가장 우선으로 참고하세요.
2. 감상평에 없는 내용은 "사용자가 직접 입력한 메시지"를 참고하세요.
3. "AI 챗봇의 답변"은 대화 맥락을 이해하기 위한 보조 자료일 뿐입니다. AI 답변에만 등장하고 사용자가 감상평이나 자신의 메시지에서 직접 언급하거나 질문하지 않은 영화적 요소·정보는 절대 키워드나 요약 문장의 근거로 쓰지 마세요.

[키워드가 나타내야 하는 것]
- 키워드는 "사용자가 이 영화에서 무엇에 반응했는가"를 나타내야 합니다. "사용자가 어떤 사람인가"(성격, 성향, 태도)를 나타내면 절대 안 됩니다.
- 절대 금지: 분석적, 호기심, 감성적, 비판적처럼 사용자의 성격·성향·태도를 지칭하는 키워드는 어떤 형태로든 만들지 마세요.
- 좋은 예: 공간연출, 계급은유, 엔딩실망, 음악만족, 장르전환처럼, 영화의 구체적 요소(연출, 서사, 인물, 음악, 결말, 장르 등)와 그에 대한 사용자의 반응을 결합한 키워드를 만드세요.
- 키워드에 "#" 기호나 다른 특수문자를 붙이지 마세요. 순수 텍스트 단어로만 쓰고, 반드시 쉼표(,)로 구분하세요.
- 영화 제목, 배우/등장인물 이름 같은 고유명사를 그대로 키워드로 쓰지 마세요.
- 키워드 개수는 내용에서 실제로 드러나는 만큼만 쓰세요. 최소 개수 제한은 없고, 최대 4개를 넘지 마세요.
- 절대 규칙: 1·2순위 자료에 명시적으로 드러나지 않은 반응을 지어내서 개수를 채우면 안 됩니다. 내용이 짧고 단순하면 키워드는 1개여도 됩니다.
- 원문의 길이·문체·표현 방식에 대한 묘사(예: "단순함", "짧음", "간결함")는 사용자의 반응이 아니므로 키워드로 쓰지 마세요.
- 확신이 서지 않는 키워드는 차라리 빼세요. 개수를 채우는 것보다 정확한 게 훨씬 중요합니다.
- 뒤의 문장은 사용자를 3인칭으로 서술하는 짧은 문장 1개 (20~40자 내외)
- 위 한 줄 형식 그대로, 줄바꿈 없이 출력하세요`;

  const chatClient = getChatClient();
  const raw = await chatClient.sendMessage([], { tone: "normal", context, temperature: 0 });
  const summaryText = cleanSummaryText(raw);

  return prisma.summary.create({ data: { movieId, summaryText } });
}
