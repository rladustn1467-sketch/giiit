import { prisma } from "@/lib/prisma";
import TastePanel from "@/components/TastePanel";
import { mapTasteAnalysisRow } from "@/lib/taste";

export const dynamic = "force-dynamic";

const USER_ID = 1;
const MIN_MOVIES = 3;

export default async function TastePage() {
  const movieCount = await prisma.movie.count({ where: { userId: USER_ID } });

  if (movieCount < MIN_MOVIES) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">취향 분석</h1>
        <p className="py-20 text-center text-neutral-600">
          더 많은 영화를 기록해주세요. (최소 {MIN_MOVIES}편 필요, 현재 {movieCount}편)
        </p>
      </div>
    );
  }

  const row = await prisma.tasteAnalysis.findFirst({
    where: { userId: USER_ID },
    orderBy: { id: "desc" },
  });
  const initialAnalysis = row ? mapTasteAnalysisRow(row) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">취향 분석</h1>
      <TastePanel initialAnalysis={initialAnalysis} />
    </div>
  );
}
