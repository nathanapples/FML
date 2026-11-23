"use client";
import { usePathname, useRouter } from "next/navigation";

export function SeasonSelect({ seasons, current }: { seasons: { year: number; name: string }[]; current: number }) {
  const router = useRouter();
  const path = usePathname();
  if (seasons.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="sr-only">Season</span>
      <select
        className="rounded-md bg-transparent py-1 pl-1 pr-0 font-semibold text-ink hover:bg-white sm:pl-2 sm:pr-1"
        value={current}
        onChange={(e) => router.push(`${path}?season=${e.target.value}`)}
      >
        {seasons.map((s) => (
          <option key={s.year} value={s.year}>{s.year}</option>
        ))}
      </select>
    </label>
  );
}
