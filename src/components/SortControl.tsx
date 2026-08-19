"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "watchedDate", label: "감상일순" },
  { value: "ratingAsc", label: "평점 낮은순" },
  { value: "ratingDesc", label: "평점 높은순" },
  { value: "title", label: "제목순" },
] as const;

export default function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "watchedDate";

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", event.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="bg-neutral-900 border border-neutral-700 rounded-md text-sm px-3 py-1.5 text-neutral-100"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
