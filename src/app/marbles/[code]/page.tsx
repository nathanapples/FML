import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { pageData, fmtDate, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { Flag } from "@/components/Flag";
import { EmptySeason } from "@/components/Empty";

export const dynamic = "force-dynamic";

const MEDAL = ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"];

export default async function MarblePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { code } = await params;
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/marbles" /><EmptySeason /></>);
  const marble = [...data.marbles.values()].find((m) => m.code === decodeURIComponent(code));
  if (!marble) notFound();
  const standing = data.marbleStandings.find((s) => s.marble.id === marble.id);
  const max = data.season.pointsTable[0] || 25;

  // every stint this marble team had on a fantasy team, including ones traded away
  const stints = data.teams.flatMap((t) =>
    t.picks
      .filter((p) => p.marbleId === marble.id)
      .map((p) => {
        const next = t.picks.filter((o) => o.slot === p.slot && o.startEvent > p.startEvent).sort((a, b) => a.startEvent - b.startEvent)[0];
        const points = t.events.filter((e) => e.eventNo >= p.startEvent && (!next || e.eventNo < next.startEvent)).reduce((a, e) => a + (e.slots.find((s) => s.slot === p.slot)?.points ?? 0), 0);
        return { team: t, from: p.startEvent, until: next ? next.startEvent - 1 : null, points };
      })
  );
  stints.sort((a, b) => Number(a.until != null) - Number(b.until != null) || b.points - a.points);

  const finishes = data.events.map((e) => {
    const r = data.results.get(e.no)?.find((x) => x.marbleId === marble.id);
    return { e, placement: r?.placement ?? null, points: r?.points ?? null };
  });
  const raced = finishes.filter((f) => f.e.completed && f.points != null);
  const best = raced.length ? Math.min(...raced.map((f) => f.placement ?? 99)) : null;

  return (
    <>
      <SiteHeader leagueName={leagueName} season={data.season} seasons={seasons} active="/marbles" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <nav className="pt-5 text-[15px] text-ink-soft">
          <BackLink fallback={`/marbles${q}`} />
        </nav>

        <header className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-5">
          <Marble m={marble} size={104} />
          <div className="min-w-0 flex-1 basis-48">
            <h1 className="font-display text-5xl font-bold leading-none tracking-tight">{marble.name}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 text-ink-soft">
              <span>{data.season.name}</span>
              {marble.wikiLink && <a className="underline decoration-frost underline-offset-4 hover:text-ink" href={marble.wikiLink} target="_blank" rel="noreferrer">Wiki</a>}
            </p>
          </div>
          {standing && (
            <dl className="flex w-full gap-8 sm:w-auto">
              <div><dt className="text-sm text-ink-faint">Position</dt><dd className="num text-5xl font-bold leading-none">{data.completed.length ? ordinal(standing.rank) : "–"}</dd></div>
              <div><dt className="text-sm text-ink-faint">Points</dt><dd className="num text-5xl font-bold leading-none">{standing.total}</dd></div>
            </dl>
          )}
        </header>

        {standing ? (
          <>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {[["Gold", standing.gold, 0], ["Silver", standing.silver, 1], ["Bronze", standing.bronze, 2]].map(([label, n, i]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full" style={{ background: MEDAL[i as number] }} aria-hidden />
                  <div><dt className="text-sm text-ink-faint">{label}</dt><dd className="num text-2xl font-bold leading-none">{n}</dd></div>
                </div>
              ))}
              {best != null && best < 99 && (
                <div><dt className="text-sm text-ink-faint">Best finish</dt><dd className="num text-2xl font-bold leading-none">{ordinal(best)}</dd></div>
              )}
            </dl>

            <section className="mt-12">
              <h2 className="font-display text-3xl font-bold tracking-tight">On fantasy teams</h2>
              {stints.length === 0 ? (
                <p className="mt-3 text-ink-soft">No fantasy team picked {marble.name} this season.</p>
              ) : (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {stints.map((s, i) => (
                    <li key={i} className="relative flex items-center gap-3 rounded-xl bg-board px-3 py-2.5 hover:bg-white/70">
                      <Flag src={s.team.flag} name={s.team.name} size={40} />
                      <span className="min-w-0 flex-1">
                        <Link href={`/teams/${s.team.id}${q}`} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">{s.team.name}</Link>
                        <span className="block truncate text-sm text-ink-soft">
                          {s.team.manager}
                          {s.until != null ? `, events ${s.from} to ${s.until}` : s.from > 1 ? `, since event ${s.from}` : ""}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="num block text-2xl font-bold leading-none">{s.points}</span>
                        <span className="text-xs text-ink-faint">pts for them</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12">
              <h2 className="font-display text-3xl font-bold tracking-tight">Event by event</h2>
              <ol className="mt-4 overflow-hidden rounded-2xl bg-board">
                {finishes.map(({ e, placement, points }) => (
                  <li key={e.no} className={`relative grid grid-cols-[2rem_1fr_3.5rem_2.5rem] items-center gap-3 border-b border-frost px-4 py-2 last:border-0 hover:bg-ice/60 sm:grid-cols-[2rem_1fr_10rem_3.5rem_3rem] ${e.completed ? "" : "text-ink-faint"}`}>
                    <span className="num text-lg text-ink-faint">{e.no}</span>
                    <span className="min-w-0">
                      <Link href={`/events/${e.no}${q}`} className="block truncate font-medium after:absolute after:inset-0 after:content-['']">{e.name}</Link>
                      <span className="block text-sm text-ink-faint">{e.completed ? fmtDate(e.date) : "Not raced yet"}</span>
                    </span>
                    <span className="hidden sm:block">
                      {e.completed && points != null && <span className="block h-2 rounded-full" style={{ width: `${Math.max(4, (points / max) * 100)}%`, background: `color-mix(in oklab, ${marble.color} 82%, #0b2a4a)` }} />}
                    </span>
                    <span className="num text-right text-lg font-semibold">
                      {e.completed && placement != null ? (
                        placement <= 3 ? (
                          <span className="inline-block rounded-full px-2 text-white" style={{ background: MEDAL[placement - 1] }}>{ordinal(placement)}</span>
                        ) : ordinal(placement)
                      ) : ""}
                    </span>
                    <span className="num text-right text-xl font-bold">{e.completed ? points ?? "–" : ""}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-frost px-6 py-12 text-center text-ink-soft">{marble.name} isn&apos;t competing in {data.season.name}.</p>
        )}
      </main>
    </>
  );
}
