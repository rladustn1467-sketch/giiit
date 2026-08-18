import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatClient } from "@/lib/ai/chatClient";

// Ollama 응답이 느릴 수 있어 서버리스 함수 제한 시간을 최대로 요청한다 (Vercel Hobby 상한 60초).
export const maxDuration = 60;

const USER_ID = 1;

const DEFAULT_CATEGORIES = [
  "인생작",
  "재밌게 본 영화",
  "취향 아니었던 영화",
  "AI와 뜨겁게 토론한 영화",
] as const;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// 두드러지는 영화만 폴더에 담기는 걸 전제로 한 상한선. 강제 목표치가 아니라 "이 이상은 만들지 마라"는 가이드일 뿐이다.
// 분류가 선택적이라 폴더가 모든 영화를 나눠 담지 않으므로, 4개 기본 카테고리가 항상 들어갈 자리는 보장하고
// 라이브러리가 충분히 커지면(20편 이상) 그 이상으로도 늘어난다.
function computeMaxFolders(movieCount: number): number {
  if (movieCount === 0) return 0;
  if (movieCount < 5) return 2;
  return Math.max(DEFAULT_CATEGORIES.length, Math.ceil(movieCount / 5));
}

type MovieWithRelations = {
  id: number;
  title: string;
  rating: number | null;
  review: string | null;
  conversations: { role: string; content: string }[];
  summaries: { summaryText: string }[];
};

function buildMovieProfileText(movie: MovieWithRelations): string {
  const messageCount = movie.conversations.length;
  const lines = [
    `- id:${movie.id} 제목:"${movie.title}" 평점:${movie.rating ?? "없음"} 대화메시지수:${messageCount}개`,
  ];
  if (movie.review) {
    lines.push(`  감상평: ${truncate(movie.review, 200)}`);
  }
  const latestSummaryText = movie.summaries[0]?.summaryText;
  if (latestSummaryText) {
    lines.push(`  대화요약: ${truncate(latestSummaryText, 200)}`);
  }
  if (messageCount > 0) {
    const transcript = movie.conversations
      .slice(-16)
      .map((c) => `${c.role === "user" ? "사용자" : "AI"}: ${c.content}`)
      .join(" / ");
    lines.push(`  대화 내용: ${truncate(transcript, 800)}`);
  }
  return lines.join("\n");
}

type OrganizeFolder = { name: string; movieIds: number[] };

function extractJsonBlock(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  }
  return raw.slice(start, end + 1);
}

function parseOrganizeResponse(raw: string): OrganizeFolder[] {
  const parsed: unknown = JSON.parse(extractJsonBlock(raw));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { folders?: unknown }).folders)
  ) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const folders = (parsed as { folders: unknown[] }).folders;
  return folders
    .map((f) => {
      if (typeof f !== "object" || f === null) return null;
      const name = String((f as { name?: unknown }).name ?? "").trim();
      const movieIdsRaw = (f as { movieIds?: unknown }).movieIds;
      if (!name || !Array.isArray(movieIdsRaw)) return null;
      const movieIds = movieIdsRaw.filter((v): v is number => typeof v === "number");
      return { name, movieIds };
    })
    .filter((f): f is OrganizeFolder => f !== null);
}

// AI 결과를 실제 존재하는 영화 id와 대조해 정리한다: 유령 id 제거, 같은 영화가 여러 폴더에 겹치면 먼저 나온 폴더만 인정.
// 분류에서 빠진 영화는 그대로 미분류로 둔다 (강제로 채워 넣지 않음).
function reconcileFolders(aiFolders: OrganizeFolder[], movies: { id: number }[]): OrganizeFolder[] {
  const validIds = new Set(movies.map((m) => m.id));
  const assigned = new Set<number>();
  const result: OrganizeFolder[] = [];

  for (const folder of aiFolders) {
    const movieIds = folder.movieIds.filter((id) => validIds.has(id) && !assigned.has(id));
    movieIds.forEach((id) => assigned.add(id));
    if (movieIds.length > 0) {
      result.push({ name: folder.name, movieIds });
    }
  }

  return result;
}

export async function POST() {
  const movies = await prisma.movie.findMany({
    where: { userId: USER_ID },
    orderBy: { id: "asc" },
    include: {
      conversations: { orderBy: { createdAt: "asc" } },
      summaries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (movies.length === 0) {
    await prisma.folder.deleteMany({ where: { userId: USER_ID } });
    return NextResponse.json({ folders: [] });
  }

  const maxFolders = computeMaxFolders(movies.length);
  const profiles = movies.map(buildMovieProfileText);

  const context = `당신은 사용자의 영화 감상 데이터를 분석해서 라이브러리 폴더로 자동 분류하는 도우미입니다.

다음은 사용자가 지금까지 등록한 영화 ${movies.length}개의 데이터입니다. 각 영화의 감상평, AI와 나눈 대화, 평점을 참고해서 뚜렷하게 두드러지는 영화만 골라 분류하세요.

${profiles.join("\n\n")}

[분류 규칙]
1. 모든 영화를 억지로 분류하지 마세요. 평점/감상평/대화가 애매하거나 특별히 두드러지지 않는 영화는 어느 폴더에도 넣지 말고 그냥 빼세요(미분류). 폴더는 확실히 두드러지는 영화만 모으는 용도입니다.
2. 다음 4개는 미리 정의된 카테고리입니다. 뚜렷하게 해당하는 영화가 있을 때만 사용하세요.
   - "${DEFAULT_CATEGORIES[0]}": 평점이 특히 높고 감상평에서 각별한 애정이 드러나는 영화
   - "${DEFAULT_CATEGORIES[1]}": 무난하게 재밌게 본 영화
   - "${DEFAULT_CATEGORIES[2]}": 평점이 낮거나 감상평에서 아쉬움/실망이 뚜렷한 영화
   - "${DEFAULT_CATEGORIES[3]}": 다른 영화들에 비해 대화메시지수가 뚜렷하게 많고, 대화 내용을 실제로 읽어봤을 때 의견 대립·반박·깊이 파고드는 질문 등 진짜 "열띤 토론"이라고 부를 만한 영화. 단순히 메시지 수만 많고 내용은 밋밋한 대화(짧은 감상 나열, 사무적인 응답 등)는 절대 포함하지 마세요. 메시지 수가 적어도 내용이 열띤 토론이면 포함해도 됩니다.
3. 위 4개로 설명되지 않는 뚜렷한 패턴(장르, 감정, 특정 취향 등)이 보일 때만 새 카테고리를 만드세요. 근거 없이 억지로 세분화하지 마세요.
4. 폴더 개수는 최대 ${maxFolders}개까지입니다. 두드러지는 영화가 없으면 폴더를 하나도 만들지 않아도 됩니다.
5. 폴더에 포함하는 영화는 각각 정확히 하나의 폴더에만 넣으세요. 나열된 영화 id 중 실제로 존재하는 id만 사용하세요.
6. 폴더 이름은 사용자가 보게 될 한글 이름입니다. 간결하게(2~10자) 지으세요.

[출력 형식]
아래 JSON 형식으로만 응답하세요. 분류할 영화가 없으면 "folders": []로 응답하세요. 설명, 마크다운 코드블록, 다른 텍스트는 절대 포함하지 마세요.
{"folders":[{"name":"폴더이름","movieIds":[1,2]}]}`;

  const chatClient = getChatClient();
  const raw = await chatClient.sendMessage([], { tone: "normal", context, temperature: 0 });

  let aiFolders: OrganizeFolder[];
  try {
    aiFolders = parseOrganizeResponse(raw);
  } catch {
    aiFolders = [];
  }

  const finalFolders = reconcileFolders(aiFolders, movies);

  await prisma.$transaction(async (tx) => {
    await tx.folder.deleteMany({ where: { userId: USER_ID } });
    for (const folder of finalFolders) {
      await tx.folder.create({
        data: {
          userId: USER_ID,
          name: folder.name,
          folderMovies: { create: folder.movieIds.map((movieId) => ({ movieId })) },
        },
      });
    }
  });

  const folders = await prisma.folder.findMany({
    where: { userId: USER_ID },
    include: { folderMovies: { include: { movie: true } } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ folders });
}
