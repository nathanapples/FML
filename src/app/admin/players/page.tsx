import Link from "next/link";
import { adminData } from "@/lib/admin";
import { allPlayers } from "@/lib/players";
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Flag } from "@/components/Flag";
import { renamePlayer, mergePlayer, addPlayer, deletePlayer } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPlayers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons } = await adminData(searchParams);
  const players = allPlayers();
  return (
    <AdminShell active="/admin/players" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Players</h1>
      <p className="mb-6 mt-1 max-w-2xl text-ink-soft">
        The people behind the fantasy teams. Each team is linked to a player, so a player&apos;s history follows them from season to season even when the team name changes.
        Fix duplicates by merging, for example two spellings of the same name.
      </p>

      <form action={addPlayer} className="mb-6 flex max-w-md gap-2">
        <input name="name" placeholder="New player's name" className="field" aria-label="New player's name" required />
        <Submit pendingText="Adding…">Add player</Submit>
      </form>

      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id}>
            <details className="group rounded-2xl bg-board open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
                    {p.careers.length === 0 && <span>No teams yet</span>}
                    {p.careers.map((c) => (
                      <span key={c.teamId} className="inline-flex items-center gap-1.5">
                        <Flag src={c.flag} name={c.teamName} size={16} />
                        <span className="num text-ink-faint">{c.seasonYear}</span> {c.teamName}
                      </span>
                    ))}
                  </span>
                </span>
                <svg className="flex-none text-ink-faint transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <div className="grid gap-4 border-t border-frost p-4 md:grid-cols-2">
                <form action={renamePlayer} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="flex-1"><span className="mb-1 block text-sm text-ink-soft">Name</span><input name="name" defaultValue={p.name} className="field" required /></label>
                  <Submit>Rename</Submit>
                </form>
                <form action={mergePlayer} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-sm text-ink-soft">Same person as</span>
                    <select name="into" className="field" defaultValue="" required>
                      <option value="" disabled>Choose a player</option>
                      {players.filter((o) => o.id !== p.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </label>
                  <Submit className="btn btn-quiet" pendingText="Merging…" confirm={`Move all of ${p.name}'s teams to the chosen player and remove ${p.name}?`}>Merge</Submit>
                </form>
                <div className="flex items-center gap-4 text-sm md:col-span-2">
                  <Link href={`/players/${p.id}`} className="text-ink-soft underline decoration-frost underline-offset-4 hover:text-ink">View public page</Link>
                  {p.careers.length === 0 && (
                    <form action={deletePlayer} className="ml-auto">
                      <input type="hidden" name="id" value={p.id} />
                      <Submit className="text-ink-faint hover:text-redline" pendingText="Deleting…" confirm={`Delete ${p.name}?`}>Delete player</Submit>
                    </form>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
