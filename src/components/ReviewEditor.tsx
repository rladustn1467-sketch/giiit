"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewEditorProps = {
  movieId: number;
  initialRating: number | null;
  initialReview: string | null;
};

export default function ReviewEditor({ movieId, initialRating, initialReview }: ReviewEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(initialRating != null ? String(initialRating) : "");
  const [review, setReview] = useState(initialReview ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setRating(initialRating != null ? String(initialRating) : "");
    setReview(initialReview ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating ? Number(rating) : null,
          review: review || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "저장하지 못했어요.");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          평점 (0~5)
          <input
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="예: 4.5"
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 [color-scheme:dark] max-w-[140px]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          감상평
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 resize-none"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="bg-neutral-100 text-neutral-900 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={submitting}
            className="text-sm text-neutral-400 px-3 py-1.5 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      {initialReview ? (
        <p className="text-sm whitespace-pre-wrap">{initialReview}</p>
      ) : (
        <p className="text-sm text-neutral-500">아직 감상평이 없어요.</p>
      )}
      <button type="button" onClick={startEdit} className="text-xs text-neutral-400 underline">
        {initialReview ? "수정하기" : "감상평 남기기"}
      </button>
    </div>
  );
}
