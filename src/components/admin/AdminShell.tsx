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
      <header className="border-b border-frost bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-xl font-bold">FML admin</Link>
          <nav className="flex flex-wrap gap-1 text-[15px]">
            {TABS.map((t) => (
              <Link key={t.href} href={`${t.href}${q}`} className={`rounded-md px-2.5 py-1 ${active === t.href ? "bg-white/15 font-semibold" : "text-white/70 hover:text-white"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm [&_select]:text-white [&_select]:hover:bg-white/10 [&_option]:text-ink">
            {season && <SeasonSelect seasons={seasons} current={season.year} />}
            <Link href={`/${q}`} className="text-white/70 hover:text-white">View site</Link>
            <form action={logout}><button className="text-white/70 hover:text-white">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
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
