import Link from "next/link";
import { pageData, fmtDate } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Marble } from "@/components/Marble";
import { EmptySeason } from "@/components/Empty";

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
        <h1 className="pt-10 font-display text-5xl font-bold tracking-tight">Events</h1>
        <p className="mt-2 text-ink-soft">{data.completed.length} of {season.eventCount} raced. Points per finish: {season.pointsTable.join(", ")}.</p>

        <ol className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((e) => {
            const top = results.get(e.no)?.slice(0, 3) ?? [];
            return (
              <li key={e.no}>
                <Link href={`/events/${e.no}${q}`} className={`flex h-full flex-col rounded-xl p-4 transition-colors ${e.completed ? "bg-board hover:bg-white/70" : "border border-dashed border-frost hover:bg-board/60"}`}>
                  <span className="flex items-baseline justify-between">
                    <span className="num text-3xl font-bold text-ink-faint">{e.no}</span>
                    <span className="text-sm text-ink-faint">{fmtDate(e.date) ?? "Date to be announced"}</span>
                  </span>
                  <span className="mt-1 font-display text-xl font-semibold leading-tight">{e.name}</span>
                  {e.completed ? (
                    <span className="mt-3 flex items-center gap-1.5">
                      {top.map((r, i) => (
                        <Marble key={r.marbleId} m={marbles.get(r.marbleId)} size={i === 0 ? 30 : 22} title={`${i + 1}. ${marbles.get(r.marbleId)?.name}`} />
                      ))}
                      <span className="ml-1 truncate text-sm text-ink-soft">{marbles.get(top[0]?.marbleId)?.name} won</span>
                      {!e.counts && <span className="ml-auto flex-none rounded-full bg-ice px-2 py-0.5 text-xs text-ink-soft" title="This event doesn't count toward league standings">Not counted</span>}
                    </span>
                  ) : (
                    <span className="mt-3 text-sm text-ink-faint">Not raced yet</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        <h2 className="mt-16 font-display text-3xl font-bold tracking-tight">Results grid</h2>
        <p className="mb-5 mt-1 text-ink-soft">Points each marble team scored, darker for bigger hauls.</p>
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
                      <Marble m={m.marble} size={20} />
                      <span className="font-medium">{m.marble.name}</span>
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
