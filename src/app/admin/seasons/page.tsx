import { adminData } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { getSetting, DEFAULT_POINTS } from "@/lib/db";
import { createSeason, updateSeason, makeCurrent, deleteSeason, saveSettings } from "../actions";
import { RestoreForm } from "./RestoreForm";

export const dynamic = "force-dynamic";

export default async function AdminSeasons({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons } = await adminData(searchParams);
  const latest = seasons[0];
  return (
    <AdminShell active="/admin/seasons" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Seasons and backup</h1>

      <section className="mt-6 rounded-2xl bg-board p-5">
        <h2 className="font-display text-2xl font-bold">League name</h2>
        <form action={saveSettings} className="mt-3 flex gap-2">
          <input name="leagueName" defaultValue={getSetting("leagueName", "Fantasy Marble League")} className="field max-w-md" aria-label="League name" />
          <Submit>Save</Submit>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl font-bold">Seasons</h2>
        <div className="mt-3 space-y-3">
          {seasons.map((s) => (
            <div key={s.id} className="rounded-2xl bg-board p-5">
              <form action={updateSeason} className="grid items-end gap-3 md:grid-cols-[6rem_1fr_6rem_1.4fr_auto]">
                <input type="hidden" name="id" value={s.id} />
                <label><span className="mb-1 block text-sm text-ink-soft">Year</span><input name="year" type="number" defaultValue={s.year} className="field" /></label>
                <label><span className="mb-1 block text-sm text-ink-soft">Name</span><input name="name" defaultValue={s.name} className="field" /></label>
                <label><span className="mb-1 block text-sm text-ink-soft">Slots</span><input name="slots" type="number" min={1} max={6} defaultValue={s.slotsPerTeam} className="field" /></label>
                <label><span className="mb-1 block text-sm text-ink-soft">Points for 1st, 2nd, 3rd…</span><input name="points" defaultValue={s.pointsTable.join(", ")} className="field" /></label>
                <Submit>Save</Submit>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {s.isCurrent ? (
                  <span className="rounded-full bg-ink px-3 py-1 font-semibold text-white">Shown on the home page</span>
                ) : (
                  <form action={makeCurrent}><input type="hidden" name="id" value={s.id} /><Submit className="btn btn-quiet" pendingText="…">Show on home page</Submit></form>
                )}
                <span className="text-ink-faint">{s.eventCount} events</span>
                <details className="ml-auto">
                  <summary className="cursor-pointer text-ink-faint hover:text-redline">Delete season</summary>
                  <form action={deleteSeason} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input name="confirm" placeholder='Type "delete"' className="field w-36" aria-label="Type delete to confirm" />
                    <Submit className="btn btn-danger" pendingText="Deleting…">Delete {s.year}</Submit>
                  </form>
                </details>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-board p-5">
        <h2 className="font-display text-2xl font-bold">Start a new season</h2>
        <p className="mt-1 text-ink-soft">Creates the events and makes it the season on the home page. Marble teams and league teams can be carried over.</p>
        <form action={createSeason} className="mt-4 grid gap-3 md:grid-cols-4">
          <label><span className="mb-1 block text-sm text-ink-soft">Year</span><input name="year" type="number" defaultValue={(latest?.year ?? new Date().getFullYear() - 1) + 1} className="field" required /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Name</span><input name="name" placeholder={`Marble League ${(latest?.year ?? new Date().getFullYear() - 1) + 1}`} className="field" /></label>
          <label><span className="mb-1 block text-sm text-ink-soft">Events</span><input name="eventCount" type="number" min={1} max={60} defaultValue={16} className="field" /></label>
          <label><span className="mb-1 block text-sm text-ink-soft">Slots per team</span><input name="slots" type="number" min={1} max={6} defaultValue={2} className="field" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-sm text-ink-soft">Points for 1st, 2nd, 3rd…</span><input name="points" defaultValue={(latest?.pointsTable ?? DEFAULT_POINTS).join(", ")} className="field" /></label>
          {latest && (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="copyFrom" value={latest.id} defaultChecked /> Same marble teams as {latest.year}</label>
              <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="copyTeams" /> Bring back {latest.year}&apos;s league teams and managers (no picks)</label>
            </>
          )}
          <div className="md:col-span-4"><Submit pendingText="Creating…">Create season</Submit></div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-board p-5">
        <h2 className="font-display text-2xl font-bold">Backup</h2>
        <p className="mt-1 max-w-2xl text-ink-soft">The download holds every season, result, pick and flag image in one JSON file. Restoring a full backup replaces everything here; restoring a single season file adds that season.</p>
        <div className="mt-4 flex flex-wrap items-start gap-6">
          <a href="/admin/export" className="btn">Download backup</a>
          <RestoreForm />
        </div>
      </section>
    </AdminShell>
  );
}
