import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/MovieCard";
import SearchControl from "@/components/SearchControl";
import { parseKeywordSummary } from "@/lib/summary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recentMovies = await prisma.movie.findMany({
    orderBy: { watchedDate: "desc" },
    take: 4,
    include: {
      summaries: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-center text-center gap-4 py-12">
        <span className="text-4xl">🎬</span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          내가 본 영화, 기록하고 다시 꺼내보기
        </h1>
        <p className="text-neutral-400 max-w-md">
          감상일, 평점, 감상평을 남기고 AI가 만들어주는 요약과 키워드로
          나만의 영화 아카이브를 만들어보세요.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/movies/new"
            className="text-sm px-4 py-2 rounded-md bg-neutral-100 text-neutral-900 font-medium hover:bg-white transition-colors"
          >
            영화 등록하기
          </Link>
          <Link
            href="/movies"
            className="text-sm px-4 py-2 rounded-md border border-neutral-700 text-neutral-300 hover:text-neutral-100 hover:border-neutral-500 transition-colors"
          >
            내 목록 보기
          </Link>
        </div>
        <div className="mt-2">
          <SearchControl targetPath="/movies" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">최근 등록한 영화</h2>
          {recentMovies.length > 0 && (
            <Link href="/movies" className="text-xs text-neutral-500 hover:text-neutral-300">
              전체 보기 →
            </Link>
          )}
        </div>

        {recentMovies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400 border border-dashed border-neutral-800 rounded-lg">
            <p>아직 등록한 영화가 없어요.</p>
            <Link
              href="/movies/new"
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900"
            >
              첫 영화 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.posterPath}
                watchedDate={movie.watchedDate}
                rating={movie.rating}
                keywords={parseKeywordSummary(movie.summaries[0]?.summaryText ?? "")?.keywords ?? []}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
