"use client";

import { useCallback, useState } from "react";
import type { TasteAnalysisResult } from "@/lib/taste";

type TastePanelProps = {
  initialAnalysis: TasteAnalysisResult | null;
};

export default function TastePanel({ initialAnalysis }: TastePanelProps) {
  const [analysis, setAnalysis] = useState<TasteAnalysisResult | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/taste", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "취향 분석에 실패했습니다.");
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "취향 분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const maxGenreCount = analysis ? Math.max(1, ...analysis.genreStats.map((g) => g.count)) : 1;
  const maxRatingCount = analysis
    ? Math.max(1, ...analysis.ratingStats.distribution.map((b) => b.count))
    : 1;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={runAnalysis}
        disabled={loading}
        className="self-start text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
      >
        {loading ? "취향을 분석하는 중... (최대 1분 정도 걸려요)" : analysis ? "다시 분석하기" : "분석하기"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="py-20 text-center text-neutral-600">감상평과 평점을 분석하고 있어요...</p>
      ) : analysis ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-neutral-600">
            총 {analysis.movieCount}편의 기록을 바탕으로 분석했어요.
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[#333]">장르 선호도</h2>
            {analysis.genreStats.length === 0 ? (
              <p className="text-sm text-neutral-600">장르 정보를 가져오지 못했어요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {analysis.genreStats.map((g) => (
                  <div key={g.genre} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-sm text-[#333] truncate">{g.genre}</span>
                    <div className="flex-1 h-4 rounded bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-neutral-800 rounded"
                        style={{ width: `${(g.count / maxGenreCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-xs text-neutral-600 text-right">
                      {g.count}편{g.avgRating != null ? ` · 평균 ${g.avgRating.toFixed(1)}점` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[#333]">
              평점 분포{analysis.ratingStats.average != null ? ` · 평균 ${analysis.ratingStats.average.toFixed(1)}점` : ""}
            </h2>
            {analysis.ratingStats.count === 0 ? (
              <p className="text-sm text-neutral-600">평점을 남긴 영화가 없어요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {analysis.ratingStats.distribution.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-sm text-[#333]">{b.label}</span>
                    <div className="flex-1 h-4 rounded bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full bg-neutral-800 rounded"
                        style={{ width: `${(b.count / maxRatingCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-xs text-neutral-600 text-right">{b.count}편</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
            <h2 className="text-sm font-semibold text-[#333]">💡 감상평 기반 취향 요약</h2>
            <p className="text-sm text-[#333]">{analysis.reviewSummary}</p>
          </section>
        </div>
      ) : !error ? (
        <p className="py-20 text-center text-neutral-600">
          아직 분석 결과가 없어요. 위 버튼을 눌러 취향을 분석해보세요.
        </p>
      ) : null}
    </div>
  );
}
