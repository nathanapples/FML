import Link from "next/link";
import { notFound } from "next/navigation";
import { getSetting, db } from "@/lib/db";
import { listSeasons, resolveSeason } from "@/lib/season";
import { getPlayer } from "@/lib/players";
import { ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";

const MEDAL = ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"];

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db();
  const p = getPlayer(Number(id));
  if (!p) notFound();
  const leagueName = getSetting("leagueName", "Fantasy Marble League");
  const totalPoints = p.careers.reduce((a, c) => a + c.points, 0);
  const latest = p.careers[0];

  return (
    <>
      <SiteHeader leagueName={leagueName} season={resolveSeason(null)} seasons={listSeasons()} active="/" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <nav className="pt-5 text-[15px] text-ink-soft">
          <Link href="/players" className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-white hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            All players
          </Link>
        </nav>

        <header className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-5">
          <Flag src={latest?.flag ?? null} name={latest?.teamName ?? p.name} size={96} className="rounded-2xl" />
          <div className="min-w-0 flex-1 basis-48">
            <h1 className="font-display text-5xl font-bold leading-none tracking-tight">{p.name}</h1>
            <p className="mt-2 text-ink-soft">{p.seasons} {p.seasons === 1 ? "season" : "seasons"} in the league</p>
          </div>
          <dl className="flex w-full gap-8 sm:w-auto">
            <div><dt className="text-sm text-ink-faint">Titles</dt><dd className="num text-5xl font-bold leading-none">{p.titles}</dd></div>
            <div><dt className="text-sm text-ink-faint">Best finish</dt><dd className="num text-5xl font-bold leading-none">{p.bestFinish ? ordinal(p.bestFinish) : "–"}</dd></div>
            <div><dt className="text-sm text-ink-faint">Career points</dt><dd className="num text-5xl font-bold leading-none">{totalPoints}</dd></div>
          </dl>
        </header>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">Season by season</h2>
          <ol className="overflow-hidden rounded-2xl bg-board">
            {p.careers.map((c) => {
              const q = c.isCurrent ? "" : `?season=${c.seasonYear}`;
              return (
                <li key={c.teamId} className="relative grid grid-cols-[3.25rem_auto_1fr_auto] items-center gap-3 border-b border-frost px-4 py-3 last:border-0 hover:bg-ice/60 sm:grid-cols-[4rem_auto_1fr_7rem_5rem]">
                  <span className="num text-2xl font-bold text-ink-faint">{c.seasonYear}</span>
                  <Flag src={c.flag} name={c.teamName} size={48} />
                  <span className="min-w-0">
                    <Link href={`/teams/${c.teamId}${q}`} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">{c.teamName}</Link>
                    <span className="block text-sm text-ink-soft">
                      {c.finished ? `Finished ${ordinal(c.rank)} of ${c.teams}` : `${ordinal(c.rank)} of ${c.teams} after ${c.completed} of ${c.eventCount} events`}
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    {c.finished && c.rank <= 3 && (
                      <span className="num inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold text-white" style={{ background: MEDAL[c.rank - 1] }}>
                        {c.rank === 1 ? "Champion" : ordinal(c.rank)}
                      </span>
                    )}
                  </span>
                  <span className="num text-right text-3xl font-bold">{c.points}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </>
  );
}
