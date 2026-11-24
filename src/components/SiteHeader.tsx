import Link from "next/link";
import { HeaderMenu } from "./HeaderMenu";
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
  { href: "/", label: "Fantasy Teams", short: "Fantasy" },
  { href: "/marbles", label: "Marble Teams", short: "Marbles" },
  { href: "/events", label: "Events", short: "Events" },
];

export function SiteHeader({ leagueName, season, seasons, active }: { leagueName: string; season: SeasonRow | null; seasons: SeasonRow[]; active: string }) {
  const q = season && !season.isCurrent ? `?season=${season.year}` : "";
  return (
    <header className="border-b border-frost bg-ice/85 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-2.5 py-3 sm:px-6">
        <Link href={`/${q}`} className="mr-1 flex flex-none items-center gap-1.5 sm:mr-6" aria-label={`${leagueName} home`}>
          <span className="sm:hidden"><LogoMarbles size={15} /></span>
          <span className="hidden sm:inline"><LogoMarbles /></span>
          <span className="hidden font-display text-xl font-bold leading-none tracking-tight md:inline">{leagueName}</span>
          <span className="hidden font-display text-xl font-bold leading-none min-[420px]:inline md:hidden">FML</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-0.5 text-[14px] sm:gap-1.5 sm:text-[15px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`${n.href}${q}`}
              className={`whitespace-nowrap rounded-md px-2 py-1 font-medium transition-colors sm:px-3 ${active === n.href ? "text-ink bg-white shadow-[inset_0_-2px_0_var(--color-redline)]" : "text-ink-soft hover:text-ink"}`}
            >
              <span className="sm:hidden">{n.short}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex-none">
          <HeaderMenu seasons={seasons.map((x) => ({ year: x.year, name: x.name, isCurrent: x.isCurrent }))} current={season?.year ?? null} />
        </div>
      </div>
    </header>
  );
}
