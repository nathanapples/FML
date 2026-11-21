import Link from "next/link";
import { notFound } from "next/navigation";
import { pageData, fmtDate, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { Flag } from "@/components/Flag";
import { EmptySeason } from "@/components/Empty";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { no } = await params;
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/events" /><EmptySeason /></>);
  const ev = data.events.find((e) => e.no === Number(no));
  if (!ev) notFound();
  const rows = data.results.get(ev.no) ?? [];
  const prev = data.events.find((e) => e.no === ev.no - 1);
  const next = data.events.find((e) => e.no === ev.no + 1);
  const owners = (marbleId: number) => data.teams.filter((t) => t.events.find((x) => x.eventNo === ev.no)!.slots.some((s) => s.marble?.id === marbleId));
  const league = [...data.teams].map((t) => ({ t, e: t.events.find((x) => x.eventNo === ev.no)! })).sort((a, b) => b.e.total - a.e.total);

  return (
    <>
      <SiteHeader leagueName={leagueName} season={data.season} seasons={seasons} active="/events" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <nav className="flex justify-between pt-6 text-sm text-ink-soft">
          {prev ? <Link href={`/events/${prev.no}${q}`} className="hover:text-ink">&larr; {prev.name}</Link> : <span />}
          {next ? <Link href={`/events/${next.no}${q}`} className="hover:text-ink">{next.name} &rarr;</Link> : <span />}
        </nav>
        <header className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="num text-7xl font-bold leading-none text-ink-faint">{ev.no}</span>
          <div>
            <h1 className="font-display text-5xl font-bold leading-none tracking-tight">{ev.name}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 text-ink-soft">
              <span>{fmtDate(ev.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) ?? "Date to be announced"}</span>
              {ev.wikiLink && <a className="underline decoration-frost underline-offset-4 hover:text-ink" href={ev.wikiLink} target="_blank" rel="noreferrer">Wiki</a>}
              {ev.videoLink && <a className="underline decoration-frost underline-offset-4 hover:text-ink" href={ev.videoLink} target="_blank" rel="noreferrer">Watch the race</a>}
            </p>
          </div>
        </header>

        {!ev.completed ? (
          <p className="mt-12 rounded-2xl border border-dashed border-frost px-6 py-14 text-center text-ink-soft">No results yet. Once this event is raced, an admin can enter the finishing order.</p>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr] [&>section]:min-w-0">
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">Finishing order</h2>
              <ol className="overflow-hidden rounded-2xl bg-board">
                {rows.map((r) => {
                  const m = data.marbles.get(r.marbleId)!;
                  const own = owners(m.id);
                  return (
                    <li key={r.marbleId} className="flex items-center gap-3 border-b border-frost px-4 py-2.5 last:border-0">
                      <span className="num w-10 text-xl font-bold text-ink-soft">{r.placement ? ordinal(r.placement) : ""}</span>
                      <Marble m={m} size={r.placement === 1 ? 34 : 28} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{m.name}</span>
                        {own.length > 0 && <span className="block truncate text-sm text-ink-soft">Owned by {own.map((t) => t.name).join(", ")}</span>}
                      </span>
                      <span className="num text-2xl font-bold">{r.points}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">League haul</h2>
              {!ev.counts ? (
                <p className="rounded-2xl border border-dashed border-frost px-5 py-8 text-ink-soft">This event doesn&apos;t count toward league standings, so no league team scored from it.</p>
              ) : (
              <ol className="space-y-1.5">
                {league.map(({ t, e }) => (
                  <li key={t.id}>
                    <Link href={`/teams/${t.id}${q}`} className="flex items-center gap-3 rounded-lg bg-board px-3 py-2 hover:bg-white/70">
                      <Flag src={t.flag} name={t.name} size={30} />
                      <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                      {e.slots.map((s) => (
                        <span key={s.slot} className="flex items-center gap-1 text-sm text-ink-soft">
                          <Marble m={s.marble} size={18} />
                          <span className="num w-5 text-right">{s.points}</span>
                        </span>
                      ))}
                      <span className="num w-10 text-right text-xl font-bold">+{e.total}</span>
                    </Link>
                  </li>
                ))}
              </ol>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
