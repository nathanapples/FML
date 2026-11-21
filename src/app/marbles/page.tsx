import { pageData } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { EmptySeason } from "@/components/Empty";

export const dynamic = "force-dynamic";

function Medals({ g, s, b }: { g: number; s: number; b: number }) {
  const items = [
    [g, "var(--color-gold)", "gold"],
    [s, "var(--color-silver)", "silver"],
    [b, "var(--color-bronze)", "bronze"],
  ] as const;
  return (
    <span className="flex items-center gap-2.5">
      {items.map(([n, c, label]) => (
        <span key={label} className={`flex items-center gap-1 ${n === 0 ? "opacity-30" : ""}`} title={`${n} ${label}`}>
          <span className="h-3 w-3 rounded-full" style={{ background: c }} />
          <span className="num text-[15px] font-semibold">{n}</span>
        </span>
      ))}
    </span>
  );
}

export default async function MarblesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueName, data, seasons } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/marbles" /><EmptySeason /></>);
  const { marbleStandings, events, season } = data;
  const max = season.pointsTable[0] || 25;
  return (
    <>
      <SiteHeader leagueName={leagueName} season={season} seasons={seasons} active="/marbles" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h1 className="pt-10 font-display text-5xl font-bold tracking-tight">Marble teams</h1>
        <p className="mt-2 text-ink-soft">The {marbleStandings.length} teams competing in {season.name}, and how many of our league teams are riding on each.</p>
        <ol className="mt-8 overflow-hidden rounded-2xl bg-board">
          {marbleStandings.map((m) => (
            <li key={m.marble.id} className="grid grid-cols-[2rem_auto_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-frost px-4 py-3 last:border-0 md:grid-cols-[2.5rem_auto_1fr_9rem_minmax(0,14rem)_5rem]">
              <span className="num text-2xl font-bold text-ink-soft">{m.rank}</span>
              <Marble m={m.marble} size={40} />
              <span className="min-w-0">
                <span className="block font-semibold">
                  {m.marble.wikiLink ? <a href={m.marble.wikiLink} target="_blank" rel="noreferrer" className="hover:underline">{m.marble.name}</a> : m.marble.name}
                </span>
                <span className="block text-sm text-ink-soft">
                  {m.marble.code}, {m.owners === 0 ? "nobody's pick" : m.owners === 1 ? "on 1 league team" : `on ${m.owners} league teams`}
                </span>
              </span>
              <span className="col-start-3 md:col-auto"><Medals g={m.gold} s={m.silver} b={m.bronze} /></span>
              <span className="col-span-4 flex h-8 items-end gap-[3px] md:col-span-1" aria-label="Points per event">
                {events.map((e, i) => (
                  <span key={e.no} title={`${e.name}: ${m.points[i]}`} className="flex-1 rounded-sm" style={{ height: e.completed ? `${Math.max(6, (m.points[i] / max) * 100)}%` : "6%", background: e.completed ? `color-mix(in oklab, ${m.marble.color} 82%, #0b2a4a)` : "var(--color-frost)" }} />
                ))}
              </span>
              <span className="col-start-4 row-start-1 text-right num text-3xl font-bold md:col-auto md:row-auto">{m.total}</span>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
