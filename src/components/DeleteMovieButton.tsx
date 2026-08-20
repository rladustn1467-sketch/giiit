"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteMovieButton({ movieId }: { movieId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("삭제하지 못했어요.");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-600">정말 삭제할까요?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 underline disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-neutral-600 underline disabled:opacity-50"
        >
          취소
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-neutral-600 underline hover:text-red-600"
    >
      삭제하기
    </button>
  );
}
