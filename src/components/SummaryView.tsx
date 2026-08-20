"use client";

import { useState } from "react";

type Summary = {
  id: number;
  summaryText: string;
  createdAt: string;
};

export default function SummaryView({
  movieId,
  initialSummary,
}: {
  movieId: number;
  initialSummary: Summary | null;
}) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "요약을 만들지 못했어요.");
      }
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요약을 만들지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm whitespace-pre-wrap">{summary.summaryText}</p>
          <p className="text-xs text-neutral-600">
            {new Date(summary.createdAt).toLocaleString("ko-KR")}에 생성됨
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-600">아직 요약이 없어요.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="self-start bg-neutral-100 text-neutral-900 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "요약 만드는 중..." : summary ? "다시 요약하기" : "요약 만들기"}
      </button>
    </div>
  );
}
