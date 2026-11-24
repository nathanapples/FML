import Link from "next/link";
import { db, getSetting } from "@/lib/db";
import { authSettings, requireUser } from "@/lib/auth";
import { allPlayers } from "@/lib/players";
import { listSeasons, resolveSeason } from "@/lib/season";
import { ordinal } from "@/lib/page";
import { SiteHeader } from "@/components/SiteHeader";
import { PageTitle } from "@/components/PageTitle";
import { Flag } from "@/components/Flag";
import { logout } from "../admin/actions";
import { PlayerForm, ProfileForm } from "./AccountForms";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const d = db();
  const leagueName = getSetting("leagueName", "Fantasy Marble League");
  const players = allPlayers();
  const taken = new Set((d.prepare("SELECT player_id FROM users WHERE player_id IS NOT NULL AND id <> ?").all(user.id) as { player_id: number }[]).map((r) => r.player_id));
  const me = players.find((p) => p.id === user.player_id) ?? null;
  const choices = players.filter((p) => !taken.has(p.id)).map((p) => ({ id: p.id, name: p.name, seasons: p.seasons }));
  const s = authSettings();

  return (
    <>
      <SiteHeader leagueName={leagueName} season={resolveSeason(null)} seasons={listSeasons()} active="" />
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <PageTitle title="My account">Signed in as {user.display_name}{user.email ? ` (${user.email})` : ""}.</PageTitle>

        {sp.welcome && !me && (
          <p className="mb-6 rounded-xl bg-blueline/10 px-4 py-3 text-ink">
            Welcome. Pick which player you are below, so your fantasy teams from every season show up as yours.
          </p>
        )}

        <section className="rounded-2xl bg-board p-5">
          <h2 className="font-display text-2xl font-bold">Your name</h2>
          <p className="mt-1 text-sm text-ink-soft">{me ? "This is how you appear on the standings and your player page." : "Used for your account, and for your player once you pick one."}</p>
          <ProfileForm name={user.display_name} />
        </section>

        <section className="mt-4 rounded-2xl bg-board p-5">
          <h2 className="font-display text-2xl font-bold">Which player are you?</h2>
          <p className="mt-1 text-sm text-ink-soft">Your player links you to your fantasy teams across every season.</p>
          <PlayerForm current={user.player_id} choices={choices} name={user.display_name} />
          {me && me.careers.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {me.careers.map((c) => (
                <li key={c.teamId}>
                  <Link href={`/teams/${c.teamId}${c.isCurrent ? "" : `?season=${c.seasonYear}`}`} className="flex items-center gap-3 rounded-lg bg-ice px-3 py-2 hover:bg-frost">
                    <span className="num w-11 text-lg font-bold text-ink-faint">{c.seasonYear}</span>
                    <Flag src={c.flag} name={c.teamName} size={28} />
                    <span className="min-w-0 flex-1 truncate font-medium">{c.teamName}</span>
                    <span className="text-sm text-ink-soft">{c.finished ? `${ordinal(c.rank)} of ${c.teams}` : `${ordinal(c.rank)} so far`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {me && (
            <p className="mt-3 text-sm"><Link href={`/players/${me.id}`} className="text-ink-soft underline decoration-frost underline-offset-4 hover:text-ink">Your public player page</Link></p>
          )}
        </section>

        <section className="mt-4 rounded-2xl bg-board p-5">
          <h2 className="font-display text-2xl font-bold">Sign-in</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1.5 text-[15px]">
            <dt className="text-ink-faint">Signed in with</dt><dd>{s.label}</dd>
            {user.email && (<><dt className="text-ink-faint">Email</dt><dd className="truncate">{user.email}</dd></>)}
            <dt className="text-ink-faint">Access</dt><dd>{user.role === "admin" ? <>Admin, <Link href="/admin" className="underline decoration-frost underline-offset-4 hover:decoration-blueline">open admin</Link></> : "Member"}</dd>
          </dl>
          <form action={logout} className="mt-4"><button className="btn btn-quiet">Sign out</button></form>
        </section>
      </main>
    </>
  );
}
