import Link from "next/link";
import { logout } from "@/app/admin/actions";
import type { SeasonRow } from "@/lib/season";
import { SeasonSelect } from "../SeasonSelect";

const TABS = [
  { href: "/admin", label: "Results" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/teams", label: "League teams" },
  { href: "/admin/marbles", label: "Marble teams" },
  { href: "/admin/seasons", label: "Seasons and backup" },
];

export function AdminShell({ active, season, seasons, children }: { active: string; season: SeasonRow | null; seasons: SeasonRow[]; children: React.ReactNode }) {
  const q = season && !season.isCurrent ? `?season=${season.year}` : "";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-frost bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 sm:px-6">
          <div className="flex w-full items-center gap-4 py-2.5 md:w-auto">
            <Link href="/" className="font-display text-xl font-bold">FML admin</Link>
            <div className="ml-auto flex items-center gap-3 text-sm md:hidden [&_select]:text-white [&_option]:text-ink">
              {season && <SeasonSelect seasons={seasons} current={season.year} />}
              <Link href={`/${q}`} className="text-white/70 hover:text-white">Site</Link>
              <form action={logout}><button className="text-white/70 hover:text-white">Sign out</button></form>
            </div>
          </div>
          <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-2.5 text-[15px] [scrollbar-width:none] md:mx-0 md:w-auto md:overflow-visible md:px-0 md:py-2.5">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={`${t.href}${q}`}
                aria-current={active === t.href ? "page" : undefined}
                className={`flex-none whitespace-nowrap rounded-md px-2.5 py-1.5 ${active === t.href ? "bg-white/15 font-semibold" : "text-white/70 hover:text-white"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-4 text-sm md:flex [&_select]:text-white [&_select]:hover:bg-white/10 [&_option]:text-ink">
            {season && <SeasonSelect seasons={seasons} current={season.year} />}
            <Link href={`/${q}`} className="text-white/70 hover:text-white">View site</Link>
            <form action={logout}><button className="text-white/70 hover:text-white">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}

export function NoSeason() {
  return (
    <div className="rounded-2xl border border-dashed border-frost p-10 text-center text-ink-soft">
      There&apos;s no season yet. <Link href="/admin/seasons" className="font-semibold text-ink underline">Create one</Link> to get started.
    </div>
  );
}
