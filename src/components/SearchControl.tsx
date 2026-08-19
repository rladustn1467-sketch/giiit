"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// targetPath를 지정하지 않으면 현재 페이지(pathname)에서 검색한다.
// 랜딩 페이지처럼 다른 페이지의 검색 결과로 보내고 싶을 때만 지정한다 (예: "/movies").
export default function SearchControl({ targetPath }: { targetPath?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const destination = targetPath ?? pathname;
  const [value, setValue] = useState(destination === pathname ? searchParams.get("q") ?? "" : "");

  useEffect(() => {
    if (destination === pathname) {
      setValue(searchParams.get("q") ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, destination, pathname]);

  function navigate(nextValue: string) {
    const params = new URLSearchParams(destination === pathname ? searchParams.toString() : "");
    if (nextValue) {
      params.set("q", nextValue);
    } else {
      params.delete("q");
    }
    const query = params.toString();
    router.push(query ? `${destination}?${query}` : destination);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = destination === pathname ? searchParams.get("q") ?? "" : "";
      if (value === current) return;
      navigate(value);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate(value);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full sm:w-auto">
      <div className="relative w-full sm:w-56">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="제목으로 검색"
          className="bg-neutral-900 border border-neutral-700 rounded-md text-sm pl-3 pr-9 py-1.5 text-neutral-100 placeholder:text-neutral-500 w-full"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    </form>
  );
}
