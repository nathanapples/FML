import Link from "next/link";
import { pageData } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { EmptySeason } from "@/components/Empty";
import { PageTitle } from "@/components/PageTitle";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";

function Medals({ g, s, b, small = false }: { g: number; s: number; b: number; small?: boolean }) {
  const items = [
    [g, "var(--color-gold)", "gold"],
    [s, "var(--color-silver)", "silver"],
    [b, "var(--color-bronze)", "bronze"],
  ] as const;
  return (
    <span className={`flex items-center ${small ? "gap-1.5" : "gap-2.5"}`}>
      {items.map(([n, c, label]) => (
        <span key={label} className={`flex items-center ${small ? "gap-0.5" : "gap-1"} ${n === 0 ? "opacity-30" : ""}`} title={`${n} ${label}`}>
          <span className={`${small ? "h-2 w-2" : "h-3 w-3"} rounded-full`} style={{ background: c }} />
          <span className={`num font-semibold ${small ? "text-[13px]" : "text-[15px]"}`}>{n}</span>
        </span>
      ))}
    </span>
  );
}

export default async function MarblesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/marbles" /><EmptySeason /></>);
  const { marbleStandings, events, season } = data;
  const max = season.pointsTable[0] || 25;
  return (
    <>
      <SiteHeader leagueName={leagueName} season={season} seasons={seasons} active="/marbles" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <PageTitle title="Marble Teams">{season.year} season, {marbleStandings.length} marble teams.</PageTitle>
        <ol className="overflow-hidden rounded-2xl bg-board">
          {marbleStandings.map((m) => {
            const owners = data.teams.filter((t) => t.current.some((c) => c?.id === m.marble.id));
            return (
              <li key={m.marble.id} className="relative grid grid-cols-[2rem_auto_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-frost px-4 py-3 last:border-0 hover:bg-ice/60 md:grid-cols-[2.5rem_auto_1fr_9rem_minmax(0,14rem)_5rem]">
                <span className="num text-2xl font-bold text-ink-soft">{m.rank}</span>
                <Marble m={m.marble} size={40} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Link href={`/marbles/${encodeURIComponent(m.marble.code)}${q}`} className="min-w-0 truncate font-semibold after:absolute after:inset-0 after:content-['']">
                      {m.marble.name}
                    </Link>
                    <span className="flex-none md:hidden"><Medals g={m.gold} s={m.silver} b={m.bronze} small /></span>
                  </span>
                  {owners.length === 0 ? (
                    <span className="block text-sm text-ink-faint">Not on any fantasy team</span>
                  ) : (
                    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm leading-snug text-ink-soft">
                      {owners.map((t) => (
                        <span key={t.id} className="inline-flex min-w-0 items-center gap-1.5">
                          <Flag src={t.flag} name={t.name} size={16} />
                          <span className="truncate">{t.name}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="hidden md:block"><Medals g={m.gold} s={m.silver} b={m.bronze} /></span>
                <span className="col-span-4 flex h-8 items-end gap-[3px] md:col-span-1" aria-label="Points per event">
                  {events.map((e, i) => (
                    <span key={e.no} title={`${e.name}: ${m.points[i]}`} className="flex-1 rounded-sm" style={{ height: e.completed ? `${Math.max(6, (m.points[i] / max) * 100)}%` : "6%", background: e.completed ? `color-mix(in oklab, ${m.marble.color} 82%, #0b2a4a)` : "var(--color-frost)" }} />
                  ))}
                </span>
                <span className="col-start-4 row-start-1 text-right num text-3xl font-bold md:col-auto md:row-auto">{m.total}</span>
              </li>
            );
          })}
        </ol>
      </main>
    </>
  );
}
