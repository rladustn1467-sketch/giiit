"use client";

import { useState } from "react";
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
  genres: string[];
  watchProviders: WatchProvider[];
};

// 줄거리가 짧으면 line-clamp를 걸어도 실제로 잘리지 않으니, 어느 정도 길 때만 더보기 버튼을 보여준다.
const OVERVIEW_EXPAND_THRESHOLD = 80;

export default function RecommendationCard({
  title,
  releaseYear,
  overview,
  posterPath,
  reason,
  genres,
  watchProviders,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = overview.length > OVERVIEW_EXPAND_THRESHOLD;

  return (
    <div className="flex gap-4 rounded-lg overflow-hidden border border-neutral-800 p-3">
      <div className="relative w-[116px] sm:w-[139px] shrink-0 self-start aspect-[2/3] bg-neutral-900 rounded-md overflow-hidden">
        {posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            fill
            sizes="200px"
            quality={90}
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 text-xs text-center px-1">
            포스터 없음
          </div>
        )}
      </div>
      <div className="flex flex-1 min-w-0 flex-col gap-1.5">
        <p className="text-sm font-medium truncate">
          {title}
          {releaseYear && <span className="text-neutral-500"> ({releaseYear})</span>}
          {genres.length > 0 && (
            <span className="text-neutral-500"> · {genres.join(", ")}</span>
          )}
        </p>
        <div>
          <p className={expanded ? "text-sm text-[#333]" : "text-sm text-[#333] line-clamp-2"}>
            {overview || "줄거리 정보가 없습니다."}
          </p>
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 mt-0.5"
            >
              {expanded ? "접기" : "더보기"}
            </button>
          )}
        </div>
        <p className="text-sm text-[#333] border-t border-neutral-800 pt-1.5">
          💡 <span className="text-sm font-bold text-neutral-500 align-middle">AI 추천 이유</span> {reason}
        </p>

        {watchProviders.length > 0 && (
          <div className="border-t border-neutral-800 pt-1.5 flex flex-col gap-1 mt-auto">
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
