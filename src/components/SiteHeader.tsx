import Link from "next/link";
import { SeasonSelect } from "./SeasonSelect";
import { Glass } from "./Marble";
import type { SeasonRow } from "@/lib/season";

/** Five overlapping glass marbles in the league colours. */
const LOGO = [
  ["#1e6fd0", "#7db8f5"],
  ["#2b2d31", "#a2a6ad"],
  ["#e1251b", "#f58a84"],
  ["#f5b000", "#ffdd6b"],
  ["#2fa332", "#a3d957"],
] as const;

export function LogoMarbles({ size = 20 }: { size?: number }) {
  return (
    <span className="flex items-center" aria-hidden>
      {LOGO.map(([c, c2], i) => (
        <Glass key={c} color={c} color2={c2} size={size} style={{ marginLeft: i ? -size * 0.38 : 0, zIndex: LOGO.length - i }} />
      ))}
    </span>
  );
}

const NAV = [
  { href: "/", label: "Fantasy Standings", short: "Fantasy" },
  { href: "/marbles", label: "Marble League", short: "Marble League" },
  { href: "/events", label: "Events", short: "Events" },
];

export function SiteHeader({ leagueName, season, seasons, active }: { leagueName: string; season: SeasonRow | null; seasons: SeasonRow[]; active: string }) {
  const q = season && !season.isCurrent ? `?season=${season.year}` : "";
  return (
    <header className="border-b border-frost bg-ice/85 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-2.5 py-3 sm:gap-6 sm:px-6">
        <Link href={`/${q}`} className="flex items-center gap-2.5" aria-label={`${leagueName} home`}>
          <span className="sm:hidden"><LogoMarbles size={15} /></span>
          <span className="hidden sm:inline"><LogoMarbles /></span>
          <span className="hidden font-display text-xl font-bold leading-none tracking-tight md:inline">{leagueName}</span>
          <span className="hidden font-display text-xl font-bold leading-none min-[420px]:inline md:hidden">FML</span>
        </Link>
        <nav className="flex min-w-0 items-center text-[14px] sm:gap-1 sm:text-[15px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`${n.href}${q}`}
              className={`whitespace-nowrap rounded-md px-1.5 py-1 font-medium transition-colors sm:px-2.5 ${active === n.href ? "text-ink bg-white shadow-[inset_0_-2px_0_var(--color-redline)]" : "text-ink-soft hover:text-ink"}`}
            >
              <span className="sm:hidden">{n.short}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 pl-1.5 sm:gap-3 sm:pl-0">
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
