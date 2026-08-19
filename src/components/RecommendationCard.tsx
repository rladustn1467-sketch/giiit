import Image from "next/image";
import { TMDB_IMAGE_BASE_URL, TMDB_LOGO_BASE_URL } from "@/lib/tmdb";

type WatchProvider = {
  providerId: number;
  providerName: string;
  logoPath: string;
};

type RecommendationCardProps = {
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  watchProviders: WatchProvider[];
};

export default function RecommendationCard({
  title,
  releaseYear,
  overview,
  posterPath,
  reason,
  watchProviders,
}: RecommendationCardProps) {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-neutral-800">
      <div className="relative aspect-[2/3] bg-neutral-900">
        {posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
            포스터 없음
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        <p className="text-sm font-medium truncate">
          {title}
          {releaseYear && <span className="text-neutral-500"> ({releaseYear})</span>}
        </p>
        <p className="text-xs text-neutral-400 line-clamp-2">
          {overview || "줄거리 정보가 없습니다."}
        </p>
        <p className="text-xs text-neutral-300 border-t border-neutral-800 pt-1.5">💡 {reason}</p>

        {watchProviders.length > 0 && (
          <div className="border-t border-neutral-800 pt-1.5 flex flex-col gap-1">
            <div className="flex flex-wrap gap-1.5">
              {watchProviders.slice(0, 6).map((provider) => (
                <Image
                  key={provider.providerId}
                  src={`${TMDB_LOGO_BASE_URL}${provider.logoPath}`}
                  alt={provider.providerName}
                  title={provider.providerName}
                  width={32}
                  height={32}
                  className="rounded"
                />
              ))}
            </div>
            <p className="text-[10px] leading-none text-neutral-700 text-right">
              Powered by JustWatch
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
