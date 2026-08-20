"use client";

import { useCallback, useState } from "react";
import RecommendationCard from "./RecommendationCard";
import type { ReasonBasis } from "@/lib/recommend";

type WatchProvider = {
  providerId: number;
  providerName: string;
  logoPath: string;
};

type Recommendation = {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  overview: string;
  posterPath: string | null;
  reason: string;
  reasonBasis: ReasonBasis;
  genres: string[];
  watchProviders: WatchProvider[];
};

type RecommendPanelProps = {
  initialRecommendations: Recommendation[];
};

// 페이지 진입/새로고침 시에는 서버가 이미 저장된 마지막 추천 결과를 내려주므로 여기서는 아무것도 자동으로
// 요청하지 않는다. AI를 다시 호출하는 유일한 경로는 "다시 추천받기" 버튼 클릭이다.
export default function RecommendPanel({ initialRecommendations }: RecommendPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "추천을 받아오지 못했습니다.");
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천을 받아오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={fetchRecommendations}
        disabled={loading}
        className="self-start text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
      >
        {loading
          ? "취향을 분석하는 중... (최대 1분 정도 걸려요)"
          : recommendations.length > 0
            ? "다시 추천받기"
            : "추천받기"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-20 text-center text-neutral-600">
          취향을 분석해서 추천을 준비하고 있어요...
        </p>
      ) : recommendations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.tmdbId} {...rec} />
          ))}
        </div>
      ) : !error ? (
        <p className="py-20 text-center text-neutral-600">
          아직 추천받은 영화가 없어요. 위 버튼을 눌러 추천을 받아보세요.
        </p>
      ) : null}
    </div>
  );
}
