import Link from "next/link";
import { pageData, fmtDate } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble, MarbleLink } from "@/components/Marble";
import { EmptySeason } from "@/components/Empty";
import { Podium } from "@/components/Podium";
import { PageTitle } from "@/components/PageTitle";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { leagueName, data, seasons, q } = await pageData(searchParams);
  if (!data) return (<><SiteHeader leagueName={leagueName} season={null} seasons={[]} active="/events" /><EmptySeason /></>);
  const { events, results, marbles, marbleStandings, season } = data;
  const max = season.pointsTable[0] || 25;

  return (
    <>
      <SiteHeader leagueName={leagueName} season={season} seasons={seasons} active="/events" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <PageTitle title="Events">{season.year} season, completed {data.completed.length} of {season.eventCount} events.</PageTitle>

        <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.no}>
              <Link
                href={`/events/${e.no}${q}`}
                className={`flex h-full items-center gap-4 rounded-xl px-4 py-3 transition-colors ${e.completed ? "bg-board hover:bg-white/70" : "border border-dashed border-frost hover:bg-board/60"}`}
              >
                <span className="num w-9 flex-none text-4xl font-bold leading-none text-ink-faint">{e.no}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl font-semibold leading-tight">{e.name}</span>
                  <span className="block text-sm text-ink-faint">{fmtDate(e.date) ?? "Date to be announced"}</span>
                  {e.completed && !e.counts && (
                    <span className="mt-1 inline-block rounded-full bg-ice px-2 py-0.5 text-xs text-ink-soft" title="This event doesn't count toward league standings">Not counted</span>
                  )}
                </span>
                {e.completed ? (
                  <Podium rows={results.get(e.no)!} marbles={marbles} size="sm" />
                ) : (
                  <span className="flex-none text-sm text-ink-faint">Not raced yet</span>
                )}
              </Link>
            </li>
          ))}
        </ol>

        <h2 className="mb-4 mt-16 font-display text-3xl font-bold tracking-tight">Results grid</h2>
        <div className="overflow-x-auto rounded-2xl bg-board">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-ink-faint">
                <th className="sticky left-0 z-10 bg-board px-4 py-3 text-left font-medium">Team</th>
                <th className="px-2 py-3 text-right font-medium">Total</th>
                {events.map((e) => (
                  <th key={e.no} className="min-w-11 px-1 py-3 text-center font-medium">
                    <Link href={`/events/${e.no}${q}`} title={e.name} className="hover:text-ink">{e.no}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marbleStandings.map((m) => (
                <tr key={m.marble.id} className="border-t border-frost">
                  <td className="sticky left-0 z-10 bg-board px-4 py-1.5">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="num w-5 text-right text-ink-faint">{m.rank}</span>
                      <MarbleLink m={m.marble} q={q} size={20}>
                        <span className="font-medium hover:underline">{m.marble.name}</span>
                      </MarbleLink>
                    </span>
                  </td>
                  <td className="num px-2 text-right text-lg font-bold">{m.total}</td>
                  {events.map((e, i) => {
                    if (!e.completed) return <td key={e.no} className="text-center text-ink-faint/50">&middot;</td>;
                    const r = results.get(e.no)!.find((x) => x.marbleId === m.marble.id);
                    const p = m.points[i];
                    const medal = r?.placement && r.placement <= 3 ? ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"][r.placement - 1] : null;
                    return (
                      <td key={e.no} className="p-0.5 text-center">
                        <span
                          className="num grid h-8 place-items-center rounded-md text-[15px] font-semibold"
                          style={{
                            background: medal ?? `rgb(31 95 174 / ${(p / max) * 0.55})`,
                            color: medal || p / max > 0.55 ? "white" : "var(--color-ink)",
                          }}
                          title={r?.placement ? `Finished ${r.placement}` : undefined}
                        >
                          {p}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
