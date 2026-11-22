import Link from "next/link";
import { SeasonSelect } from "./SeasonSelect";
import { Glass } from "./Marble";
import type { SeasonRow } from "@/lib/season";

const NAV = [
  { href: "/", label: "Standings" },
  { href: "/events", label: "Events" },
  { href: "/marbles", label: "Marbles" },
];

export function SiteHeader({ leagueName, season, seasons, active }: { leagueName: string; season: SeasonRow | null; seasons: SeasonRow[]; active: string }) {
  const q = season && !season.isCurrent ? `?season=${season.year}` : "";
  return (
    <header className="border-b border-frost bg-ice/85 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 sm:gap-6 sm:px-4 py-3 sm:px-6">
        <Link href={`/${q}`} className="flex items-center gap-2.5" aria-label={`${leagueName} home`}>
          <span className="relative flex">
            <Glass color="#d7263d" size={24} />
            <Glass color="#1f5fae" color2="#7fb3ec" size={15} className="-ml-2 mt-2.5" />
          </span>
          <span className="hidden font-display text-xl font-bold leading-none tracking-tight md:inline">{leagueName}</span>
          <span className="hidden font-display text-xl font-bold leading-none min-[420px]:inline md:hidden">FML</span>
        </Link>
        <nav className="flex items-center gap-0.5 text-[15px] sm:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`${n.href}${q}`}
              className={`rounded-md px-2 py-1 font-medium transition-colors sm:px-2.5 ${active === n.href ? "text-ink bg-white shadow-[inset_0_-2px_0_var(--color-redline)]" : "text-ink-soft hover:text-ink"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {season && <SeasonSelect seasons={seasons} current={season.year} />}
          <Link href="/admin" className="text-sm text-ink-faint hover:text-ink" aria-label="Admin">
            <svg className="sm:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
