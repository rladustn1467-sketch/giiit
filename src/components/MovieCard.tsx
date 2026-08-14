import Image from "next/image";
import Link from "next/link";
import { TMDB_IMAGE_BASE_URL } from "@/lib/tmdb";

type MovieCardProps = {
  id: number;
  title: string;
  posterPath: string | null;
  watchedDate: Date;
  rating: number | null;
  keywords?: string[];
};

export default function MovieCard({
  id,
  title,
  posterPath,
  watchedDate,
  rating,
  keywords = [],
}: MovieCardProps) {
  return (
    <Link
      href={`/movies/${id}`}
      className="group flex flex-col rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
    >
      <div className="relative aspect-[2/3] bg-neutral-900">
        {posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
            포스터 없음
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
          <span>{watchedDate.toLocaleDateString("ko-KR")}</span>
          {rating != null && <span>⭐ {rating}</span>}
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="text-[11px] leading-none px-1.5 py-1 rounded-full bg-neutral-800 text-neutral-300 truncate max-w-full"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
