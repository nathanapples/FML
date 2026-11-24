import Link from "next/link";
import { pageData, fmtDate, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Leaderboard } from "@/components/Leaderboard";
import { SeasonStrip } from "@/components/SeasonStrip";
import { RaceChart } from "@/components/RaceChart";
import { MarbleLink } from "@/components/Marble";
import { EmptySeason } from "@/components/Empty";
import { PageTitle } from "@/components/PageTitle";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/" /><EmptySeason /></>);
  const { season, completed, lastEvent, stats, teams, events } = data;
  const next = events.find((e) => !e.completed);
  const podium = lastEvent ? data.results.get(lastEvent.no)!.slice(0, 3) : [];
  const done = completed.length === season.eventCount && season.eventCount > 0;

  return (
    <>
      <SiteHeader leagueName={leagueName} season={season} seasons={seasons} active="/" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <PageTitle title="Fantasy Teams" aside={<SeasonStrip data={data} q={q} />}>
          {completed.length === 0
            ? `${season.year} season, no events raced yet.`
            : done
              ? `${season.year} season, all ${season.eventCount} events completed.`
              : `${season.year} season, completed ${completed.length} of ${season.eventCount} events.`}
          {next && completed.length > 0 && (
            <> Next up: <Link className="font-medium text-ink underline decoration-frost underline-offset-4 hover:decoration-blueline" href={`/events/${next.no}${q}`}>{next.name}</Link>{next.date ? ` on ${fmtDate(next.date)}` : ""}.</>
          )}
        </PageTitle>

        <Leaderboard data={data} q={q} />
        <p className="mt-2 text-right text-sm"><Link href="/players" className="text-ink-soft underline decoration-frost underline-offset-4 hover:text-ink">Every player&apos;s history</Link></p>

        {completed.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 px-1 md:grid-cols-4">
            {stats.closest && (
              <Stat term="Tightest gap" value={stats.closest.gap === 0 ? "Tied" : `${stats.closest.gap} pts`}>
                {stats.closest.a.name} and {stats.closest.b.name}
                {stats.closest.gap === 0 ? `, level on ${stats.closest.a.total}` : `, for ${ordinal(stats.closest.position)}`}
              </Stat>
            )}
            <Stat term="First to last" value={`${stats.spread} pts`}>across {teams.length} teams</Stat>
            {stats.bestHaul && (
              <Stat term="Biggest single event" value={`${stats.bestHaul.points} pts`}>
                {stats.bestHaul.team.name} at {stats.bestHaul.event.name}
              </Stat>
            )}
            {stats.lastTop.length > 0 && lastEvent && (
              <Stat term={`Best at ${lastEvent.name}`} value={`${stats.lastTop[0].points} pts`}>
                {stats.lastTop.map((x) => x.team.name).join(", ")}
              </Stat>
            )}
          </dl>
        )}

        <section className="mt-14">
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">The race</h2>
          <div className="rounded-2xl bg-board p-4 sm:p-6">
            <RaceChart
              events={completed.map((e) => ({ no: e.no, name: e.name }))}
              teams={teams.map((t) => ({
                id: t.id,
                name: t.name,
                manager: t.manager,
                color: t.color,
                running: completed.map((e) => t.events.find((x) => x.eventNo === e.no)!.running),
                ranks: completed.map((e) => t.events.find((x) => x.eventNo === e.no)!.rank),
              }))}
            />
          </div>
        </section>

        {lastEvent && lastEvent.counts && (
          <section className="mt-14">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              <Link href={`/events/${lastEvent.no}${q}`} className="hover:underline">Latest Event - {lastEvent.name}</Link>
            </h2>
            <p className="mt-1 text-ink-soft">Event {lastEvent.no}{lastEvent.date ? `, ${fmtDate(lastEvent.date, { month: "long", day: "numeric", year: "numeric" })}` : ""}</p>
            <div className="mt-6 grid gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="font-display text-xl font-semibold">Marble League Podium</h3>
              <ol className="mt-4 flex items-end gap-3">
                {[1, 0, 2].map((idx) => {
                  const r = podium[idx];
                  if (!r) return <li key={idx} className="flex-1" />;
                  const m = data.marbles.get(r.marbleId)!;
                  const h = [132, 104, 84][idx];
                  return (
                    <li key={idx} className="flex flex-1 flex-col items-center gap-2">
                      <MarbleLink m={m} q={q} size={idx === 0 ? 64 : 52} className="flex-col">
                        <span className="text-center text-sm font-semibold leading-tight hover:underline">{m.name}</span>
                      </MarbleLink>
                      <span
                        className="flex w-full items-start justify-center rounded-t-xl pt-2 num text-3xl font-bold text-white"
                        style={{ height: h, background: ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"][idx] }}
                      >
                        {idx + 1}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">Top Fantasy League Points</h3>
              <ol className="mt-4 space-y-1.5">
                {[...teams]
                  .sort((a, b) => (b.lastEventPoints ?? 0) - (a.lastEventPoints ?? 0))
                  .slice(0, 6)
                  .map((t) => {
                    const ev = t.events.find((x) => x.eventNo === lastEvent.no)!;
                    return (
                      <li key={t.id} className="relative flex items-center gap-3 rounded-lg bg-board px-3 py-2 hover:bg-white/70">
                        <Link href={`/teams/${t.id}${q}`} className="min-w-0 flex-1 truncate font-medium after:absolute after:inset-0 after:content-['']">{t.name}</Link>
                        {ev.slots.map((s) => (
                          <span key={s.slot} className="flex items-center gap-1 text-sm text-ink-soft">
                            <MarbleLink m={s.marble} q={q} size={20} />
                            <span className="num w-5 text-right">{s.points}</span>
                          </span>
                        ))}
                        <span className="num w-10 text-right text-xl font-bold">+{ev.total}</span>
                      </li>
                    );
                  })}
              </ol>
            </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ term, value, children }: { term: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{term}</dt>
      <dd>
        <span className="num block text-3xl font-bold leading-tight">{value}</span>
        <span className="block text-sm leading-snug text-ink-soft">{children}</span>
      </dd>
    </div>
  );
}
