"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegenerateSummaryButton({ movieId }: { movieId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/auto-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("요약을 다시 만들지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-neutral-400 underline disabled:opacity-50"
      >
        {loading ? "요약 만드는 중..." : "다시 요약하기"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
