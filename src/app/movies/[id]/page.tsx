import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TMDB_IMAGE_BASE_URL, getMovieDetails } from "@/lib/tmdb";
import MovieChat from "@/components/MovieChat";
import RegenerateSummaryButton from "@/components/RegenerateSummaryButton";
import ReviewEditor from "@/components/ReviewEditor";
import DeleteMovieButton from "@/components/DeleteMovieButton";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: Number(id) } });

  if (!movie) {
    notFound();
  }

  const tmdbDetails = await getMovieDetails(movie.tmdbId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-4 sm:gap-6">
        {movie.posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${movie.posterPath}`}
            alt={movie.title}
            width={140}
            height={210}
            className="rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="w-[140px] h-[210px] bg-neutral-900 rounded-md flex items-center justify-center text-xs text-neutral-500 shrink-0">
            포스터 없음
          </div>
        )}

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold">
              {movie.title}
              {tmdbDetails?.releaseYear && (
                <span className="text-neutral-600 font-normal"> ({tmdbDetails.releaseYear})</span>
              )}
            </h1>
            <DeleteMovieButton movieId={movie.id} />
          </div>
          <p className="text-sm text-neutral-600">
            감상일 {movie.watchedDate.toLocaleDateString("ko-KR")}
            {movie.rating != null && ` · ⭐ ${movie.rating}`}
          </p>
          {tmdbDetails && tmdbDetails.cast.length > 0 && (
            <p className="text-sm text-neutral-600">출연: {tmdbDetails.cast.join(", ")}</p>
          )}
          {movie.overview && (
            <p className="text-sm text-neutral-600 mt-2">{movie.overview}</p>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">감상평</h2>
        <ReviewEditor movieId={movie.id} initialRating={movie.rating} initialReview={movie.review} />
      </section>

      <section className="flex flex-col gap-3 border-t border-neutral-800 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">AI 대화</h2>
          <div className="flex items-center gap-3">
            <RegenerateSummaryButton movieId={movie.id} />
            <Link href={`/movies/${movie.id}/summary`} className="text-xs text-neutral-600 underline">
              대화 요약 보기
            </Link>
          </div>
        </div>
        <MovieChat movieId={movie.id} />
      </section>
    </div>
  );
}
