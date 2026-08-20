import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/MovieCard";
import OrganizeLibraryButton from "@/components/OrganizeLibraryButton";
import { parseKeywordSummary } from "@/lib/summary";

export default async function LibraryPage() {
  const [folders, totalMovies] = await Promise.all([
    prisma.folder.findMany({
      orderBy: { id: "asc" },
      include: {
        folderMovies: {
          include: {
            movie: { include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        },
      },
    }),
    prisma.movie.count(),
  ]);

  const classifiedCount = new Set(folders.flatMap((f) => f.folderMovies.map((fm) => fm.movieId)))
    .size;
  const unclassifiedCount = totalMovies - classifiedCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">라이브러리</h1>
        <OrganizeLibraryButton />
      </div>

      {totalMovies === 0 ? (
        <p className="py-20 text-center text-neutral-600">아직 등록한 영화가 없어요.</p>
      ) : folders.length === 0 ? (
        <p className="py-20 text-center text-neutral-600">
          아직 정리된 라이브러리가 없어요. &quot;라이브러리 정리하기&quot;를 눌러 영화를 폴더로
          분류해보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {folders.map((folder) => (
            <section key={folder.id} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-neutral-700">
                {folder.name}{" "}
                <span className="font-normal text-neutral-600">
                  ({folder.folderMovies.length})
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {folder.folderMovies.map(({ movie }) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    title={movie.title}
                    posterPath={movie.posterPath}
                    watchedDate={movie.watchedDate}
                    rating={movie.rating}
                    keywords={
                      parseKeywordSummary(movie.summaries[0]?.summaryText ?? "")?.keywords ?? []
                    }
                  />
                ))}
              </div>
            </section>
          ))}
          {unclassifiedCount > 0 && (
            <p className="text-xs text-neutral-600">
              특별히 두드러지지 않는 {unclassifiedCount}편은 폴더에 담기지 않았어요. 홈 화면의
              &quot;내 영화 기록&quot;에서는 계속 볼 수 있어요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
