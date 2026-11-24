import Link from "next/link";
import { pageData, fmtDate, ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Leaderboard } from "@/components/Leaderboard";
import { SeasonStrip } from "@/components/SeasonStrip";
import { RaceChart } from "@/components/RaceChart";
import { EmptySeason } from "@/components/Empty";
import { PageTitle } from "@/components/PageTitle";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/" /><EmptySeason /></>);
  const { season, completed, lastEvent, stats, teams, events } = data;
  const next = events.find((e) => !e.completed);
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
