"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TMDB_IMAGE_BASE_URL } from "@/lib/tmdb";

type TmdbSearchResult = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
};

export default function NewMoviePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null);

  const [watchedDate, setWatchedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          title: selected.title,
          posterPath: selected.posterPath,
          overview: selected.overview,
          watchedDate,
          rating: rating ? Number(rating) : null,
          review: review || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "등록에 실패했습니다.");
      }

      const { movie } = await res.json();
      router.push(`/movies/${movie.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-6 max-w-md">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm text-neutral-400 self-start"
        >
          ← 다시 검색
        </button>

        <div className="flex gap-4">
          {selected.posterPath ? (
            <Image
              src={`${TMDB_IMAGE_BASE_URL}${selected.posterPath}`}
              alt={selected.title}
              width={100}
              height={150}
              className="rounded-md object-cover"
            />
          ) : (
            <div className="w-[100px] h-[150px] bg-neutral-900 rounded-md flex items-center justify-center text-xs text-neutral-600">
              포스터 없음
            </div>
          )}
          <div>
            <h2 className="font-semibold">{selected.title}</h2>
            <p className="text-xs text-neutral-500 mt-1">{selected.releaseDate}</p>
            <p className="text-sm text-neutral-400 mt-2 line-clamp-4">
              {selected.overview || "줄거리 정보가 없습니다."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            감상일
            <input
              type="date"
              required
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 [color-scheme:dark]"
            />
          </label>

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
              className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 placeholder:text-neutral-600 [color-scheme:dark]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            감상평
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 resize-none"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-neutral-100 text-neutral-900 rounded-md px-4 py-2 font-medium disabled:opacity-50"
          >
            {submitting
              ? review
                ? "등록 중... (감상평 요약도 같이 만드는 중이라 최대 1분 정도 걸려요)"
                : "등록 중..."
              : "등록하기"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">영화 등록</h1>
        <Link href="/movies" className="text-sm text-neutral-400 hover:text-neutral-200">
          내 목록 보기 →
        </Link>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="영화 제목을 검색하세요"
        autoFocus
        className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 placeholder:text-neutral-600"
      />

      {searching && <p className="text-sm text-neutral-500">검색 중...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => setSelected(result)}
            className="flex flex-col text-left rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
          >
            <div className="relative aspect-[2/3] bg-neutral-900">
              {result.posterPath ? (
                <Image
                  src={`${TMDB_IMAGE_BASE_URL}${result.posterPath}`}
                  alt={result.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-600 text-xs">
                  포스터 없음
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-sm font-medium truncate">{result.title}</p>
              <p className="text-xs text-neutral-500">{result.releaseDate}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
