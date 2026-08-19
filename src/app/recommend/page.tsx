import { prisma } from "@/lib/prisma";
import RecommendPanel from "@/components/RecommendPanel";
import { mapRecommendationRow } from "@/lib/recommend";

export const dynamic = "force-dynamic";

const USER_ID = 1;
const MIN_MOVIES = 3;

export default async function RecommendPage() {
  const movieCount = await prisma.movie.count();

  if (movieCount < MIN_MOVIES) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">AI 추천</h1>
        <p className="py-20 text-center text-neutral-400">
          더 많은 영화를 기록해주세요. (최소 {MIN_MOVIES}편 필요, 현재 {movieCount}편)
        </p>
      </div>
    );
  }

  const rows = await prisma.recommendation.findMany({
    where: { userId: USER_ID },
    orderBy: { id: "asc" },
  });
  const initialRecommendations = rows.map(mapRecommendationRow);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">AI 추천</h1>
      <RecommendPanel initialRecommendations={initialRecommendations} />
    </div>
  );
}
