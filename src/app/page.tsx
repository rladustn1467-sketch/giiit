import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import MovieCard from "@/components/MovieCard";
import SortControl from "@/components/SortControl";
import { parseKeywordSummary } from "@/lib/summary";

const SORT_FIELDS = ["watchedDate", "rating", "title"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSort(sort: string | undefined): Prisma.MovieOrderByWithRelationInput {
  const field: SortField = SORT_FIELDS.includes(sort as SortField)
    ? (sort as SortField)
    : "watchedDate";
  return { [field]: "desc" };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const movies = await prisma.movie.findMany({
    orderBy: parseSort(sort),
    include: {
      summaries: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">내 영화 기록</h1>
        <SortControl />
      </div>

      {movies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-neutral-400">
          <p>아직 등록한 영화가 없어요.</p>
          <Link
            href="/movies/new"
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900"
          >
            첫 영화 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {movies.map((movie) => (
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
    </div>
  );
}
