import Link from "next/link";
import { notFound } from "next/navigation";
import { pageData, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { Flag } from "@/components/Flag";
import { EmptySeason } from "@/components/Empty";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/" /><EmptySeason /></>);
  const t = data.teams.find((x) => x.id === Number(id));
  if (!t) notFound();
  const done = data.events.filter((e) => e.completed);
  const maxEv = Math.max(1, ...t.events.map((e) => e.total));
  const best = [...t.events].filter((e) => done.some((d) => d.no === e.eventNo)).sort((a, b) => b.total - a.total)[0];

  return (
    <>
      <SiteHeader leagueName={leagueName} season={data.season} seasons={seasons} active="/" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Link href={`/${q}`} className="mt-6 inline-block text-sm text-ink-soft hover:text-ink">&larr; Standings</Link>
        <header className="mt-4 flex flex-wrap items-center gap-6">
          <Flag src={t.flag} name={t.name} size={112} className="rounded-2xl shadow-[0_10px_30px_-12px_rgb(11_42_74_/_0.5)]" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">{t.name}</h1>
            <p className="mt-2 text-lg text-ink-soft">Managed by {t.manager}{t.draftOrder ? `, pick ${t.draftOrder} in the draft` : ""}</p>
          </div>
          <dl className="flex gap-8">
            <div><dt className="text-sm text-ink-faint">Position</dt><dd className="num text-5xl font-bold leading-none">{ordinal(t.rank)}</dd></div>
            <div><dt className="text-sm text-ink-faint">Points</dt><dd className="num text-5xl font-bold leading-none">{t.total}</dd></div>
            {t.gap > 0 && <div><dt className="text-sm text-ink-faint">Behind leader</dt><dd className="num text-5xl font-bold leading-none text-ink-soft">{t.gap}</dd></div>}
          </dl>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: data.season.slotsPerTeam }, (_, k) => k + 1).map((slot) => {
            const picks = t.picks.filter((p) => p.slot === slot).sort((a, b) => a.startEvent - b.startEvent);
            const m = t.current[slot - 1];
            const earned = t.events.reduce((a, e) => a + (e.slots.find((s) => s.slot === slot)?.points ?? 0), 0);
            return (
              <div key={slot} className="flex items-center gap-4 rounded-2xl bg-board p-5">
                <Marble m={m} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-faint">Slot {slot}</div>
                  <div className="font-display text-2xl font-semibold leading-tight">{m?.name ?? "Empty"}</div>
                  {picks.length > 1 && (
                    <div className="mt-1 text-sm text-ink-soft">
                      {picks.map((p, i) => (
                        <span key={p.id}>{i > 0 ? ", then " : ""}{data.marbles.get(p.marbleId)?.name}{i > 0 ? ` from event ${p.startEvent}` : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right"><div className="num text-3xl font-bold">{earned}</div><div className="text-sm text-ink-faint">pts</div></div>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl font-bold tracking-tight">Event by event</h2>
          {best && <p className="mt-1 text-ink-soft">Best night: {data.events.find((e) => e.no === best.eventNo)?.name}, {best.total} points.</p>}
          <div className="mt-5 overflow-x-auto rounded-2xl bg-board">
            <table className="w-full text-[15px]">
              <thead className="text-sm text-ink-faint">
                <tr className="border-b border-frost">
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  {Array.from({ length: data.season.slotsPerTeam }, (_, k) => <th key={k} className="px-3 py-3 text-left font-medium">Slot {k + 1}</th>)}
                  <th className="px-3 py-3 text-right font-medium">Points</th>
                  <th className="hidden w-48 px-3 py-3 md:table-cell" />
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Position</th>
                </tr>
              </thead>
              <tbody>
                {t.events.map((e) => {
                  const ev = data.events.find((x) => x.no === e.eventNo)!;
                  return (
                    <tr key={e.eventNo} className={`border-b border-frost last:border-0 ${ev.completed ? "" : "text-ink-faint"}`}>
                      <td className="px-4 py-2">
                        <Link href={`/events/${ev.no}${q}`} className="hover:underline"><span className="num mr-2 text-ink-faint">{ev.no}</span>{ev.name}</Link>
                      </td>
                      {e.slots.map((s) => (
                        <td key={s.slot} className="px-3 py-2">
                          <span className="flex items-center gap-2"><Marble m={s.marble} size={18} /><span className="num w-6">{ev.completed && ev.counts ? s.points : ""}</span></span>
                        </td>
                      ))}
                      <td className="num px-3 py-2 text-right text-lg font-semibold">{ev.completed ? (ev.counts ? e.total : <span className="font-sans text-sm font-normal text-ink-faint">Not counted</span>) : ""}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {ev.completed && ev.counts && <span className="block h-2 rounded-full bg-blueline/80" style={{ width: `${(e.total / maxEv) * 100}%` }} />}
                      </td>
                      <td className="num px-3 py-2 text-right text-lg font-bold">{ev.completed ? e.running : ""}</td>
                      <td className="num px-4 py-2 text-right text-lg">{ev.completed ? e.rank : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
