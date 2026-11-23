import Link from "next/link";
import { notFound } from "next/navigation";
import { pageData, fmtDate, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble, MarbleLink } from "@/components/Marble";
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
        <nav className="flex items-center gap-2 pt-5 text-[15px] text-ink-soft">
          <Link href={`/events${q}`} className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-white hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            All events
          </Link>
          <span className="ml-auto flex items-center gap-1">
            {prev ? (
              <Link href={`/events/${prev.no}${q}`} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white hover:text-ink" title={`Previous: ${prev.name}`} aria-label={`Previous event: ${prev.name}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
              </Link>
            ) : <span className="h-9 w-9" />}
            <span className="num text-sm text-ink-faint">{ev.no} / {data.events.length}</span>
            {next ? (
              <Link href={`/events/${next.no}${q}`} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white hover:text-ink" title={`Next: ${next.name}`} aria-label={`Next event: ${next.name}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ) : <span className="h-9 w-9" />}
          </span>
        </nav>
        <header className="mt-3 flex items-center gap-4">
          <span className="num flex-none text-[4.75rem] font-bold leading-[0.8] text-ink-faint sm:text-[5.5rem]">{ev.no}</span>
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">{ev.name}</h1>
            <p className="mt-1.5 flex flex-wrap gap-x-4 text-ink-soft">
              <span>{fmtDate(ev.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) ?? "Date to be announced"}</span>
              {ev.wikiLink && <a className="underline decoration-frost underline-offset-4 hover:text-ink" href={ev.wikiLink} target="_blank" rel="noreferrer">Wiki</a>}
              {ev.videoLink && <a className="underline decoration-frost underline-offset-4 hover:text-ink" href={ev.videoLink} target="_blank" rel="noreferrer">Watch the race</a>}
            </p>
          </div>
        </header>

        {!ev.completed ? (
          <p className="mt-12 rounded-2xl border border-dashed border-frost px-6 py-14 text-center text-ink-soft">No results yet. Once this event is raced, an admin can enter the finishing order.</p>
        ) : (
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] [&>section]:min-w-0">
            <section>
              <ol className="overflow-hidden rounded-2xl bg-board">
                {rows.map((r) => {
                  const m = data.marbles.get(r.marbleId)!;
                  const own = owners(m.id);
                  return (
                    <li key={r.marbleId} className="relative flex items-center gap-3 border-b border-frost px-4 py-2.5 last:border-0 hover:bg-ice/60">
                      <span className="num w-10 text-xl font-bold text-ink-soft">{r.placement ? ordinal(r.placement) : ""}</span>
                      <Marble m={m} size={r.placement === 1 ? 34 : 28} />
                      <span className="min-w-0 flex-1">
                        <Link href={`/marbles/${encodeURIComponent(m.code)}${q}`} className="block font-semibold after:absolute after:inset-0 after:content-['']">{m.name}</Link>
                        {own.length > 0 && <span className="block truncate text-sm text-ink-soft">Owned by {own.map((t) => t.name).join(", ")}</span>}
                      </span>
                      <span className="num text-2xl font-bold">{r.points}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold">Fantasy League Team Points</h2>
              {!ev.counts ? (
                <p className="rounded-2xl border border-dashed border-frost px-5 py-8 text-ink-soft">This event doesn&apos;t count toward league standings, so no league team scored from it.</p>
              ) : (
              <ol className="space-y-1.5">
                {league.map(({ t, e }) => (
                  <li key={t.id} className="relative flex items-center gap-3 rounded-lg bg-board px-3 py-2 hover:bg-white/70">
                    <Flag src={t.flag} name={t.name} size={30} />
                    <Link href={`/teams/${t.id}${q}`} className="min-w-0 flex-1 truncate font-medium after:absolute after:inset-0 after:content-['']">{t.name}</Link>
                    {e.slots.map((s) => (
                      <span key={s.slot} className="flex items-center gap-1 text-sm text-ink-soft">
                        <MarbleLink m={s.marble} q={q} size={20} />
                        <span className="num w-5 text-right">{s.points}</span>
                      </span>
                    ))}
                    <span className="num w-10 text-right text-xl font-bold">+{e.total}</span>
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
