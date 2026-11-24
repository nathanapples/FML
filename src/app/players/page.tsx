import Link from "next/link";
import { getSetting, db } from "@/lib/db";
import { listSeasons, resolveSeason } from "@/lib/season";
import { allPlayers } from "@/lib/players";
import { ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { PageTitle } from "@/components/PageTitle";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  db();
  const leagueName = getSetting("leagueName", "Fantasy Marble League");
  const players = allPlayers().filter((p) => p.seasons > 0).sort((a, b) => b.titles - a.titles || (a.bestFinish ?? 99) - (b.bestFinish ?? 99) || b.seasons - a.seasons || a.name.localeCompare(b.name));
  return (
    <>
      <SiteHeader leagueName={leagueName} season={resolveSeason(null)} seasons={listSeasons()} active="/" />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <PageTitle title="Players">Everyone who has run a fantasy team, across every season.</PageTitle>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const latest = p.careers[0];
            return (
              <li key={p.id} className="relative flex items-center gap-3 rounded-xl bg-board px-3 py-3 hover:bg-white/70">
                <Flag src={latest?.flag ?? null} name={latest?.teamName ?? p.name} size={48} />
                <span className="min-w-0 flex-1">
                  <Link href={`/players/${p.id}`} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">{p.name}</Link>
                  <span className="block truncate text-sm text-ink-soft">
                    {p.seasons} {p.seasons === 1 ? "season" : "seasons"}
                    {p.titles > 0 ? `, ${p.titles} ${p.titles === 1 ? "title" : "titles"}` : p.bestFinish ? `, best finish ${ordinal(p.bestFinish)}` : ""}
                  </span>
                </span>
                <span className="flex flex-none -space-x-2">
                  {p.careers.slice(0, 4).map((c) => (
                    <Flag key={c.teamId} src={c.flag} name={c.teamName} size={22} className="ring-2 ring-board" />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        {players.length === 0 && <p className="text-ink-soft">No players yet. They&apos;re created from each fantasy team&apos;s manager name.</p>}
      </main>
    </>
  );
}
