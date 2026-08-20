import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SummaryView from "@/components/SummaryView";

export default async function MovieSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    notFound();
  }

  const summary = await prisma.summary.findFirst({
    where: { movieId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/movies/${movieId}`} className="text-sm text-neutral-600 self-start">
        ← {movie.title}로 돌아가기
      </Link>

      <h1 className="text-lg font-semibold">대화 요약 · {movie.title}</h1>

      <SummaryView
        movieId={movieId}
        initialSummary={
          summary
            ? { id: summary.id, summaryText: summary.summaryText, createdAt: summary.createdAt.toISOString() }
            : null
        }
      />
    </div>
  );
}
