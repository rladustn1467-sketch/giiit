"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrganizeLibraryButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/folders/organize", { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("라이브러리 정리에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900 hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? "정리하는 중... (최대 1분 정도 걸려요)" : "라이브러리 정리하기"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
