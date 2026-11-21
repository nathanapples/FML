import { adminData } from "@/lib/admin";
import { AdminShell, NoSeason } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Marble } from "@/components/Marble";
import { Flag } from "@/components/Flag";
import { saveTeam, deleteTeam, setPick, deletePick } from "../actions";
import type { Marble as M } from "@/lib/season";

export const dynamic = "force-dynamic";

function MarbleSelect({ name, marbles, defaultValue, label }: { name: string; marbles: M[]; defaultValue?: number; label: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="field" aria-label={label} required>
      <option value="" disabled>Choose a marble team</option>
      {marbles.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
    </select>
  );
}

export default async function AdminTeams({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons, data } = await adminData(searchParams);
  if (!data) return <AdminShell active="/admin/teams" season={season} seasons={seasons}><NoSeason /></AdminShell>;
  const slots = Array.from({ length: data.season.slotsPerTeam }, (_, i) => i + 1);
  const teams = [...data.teams].sort((a, b) => (a.draftOrder ?? 999) - (b.draftOrder ?? 999) || a.name.localeCompare(b.name));
  const nextEvent = (data.lastEvent?.no ?? 0) + 1;

  return (
    <AdminShell active="/admin/teams" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">League teams</h1>
      <p className="mb-6 mt-1 text-ink-soft">Everyone playing in {data.season.name}, their draft picks, and any trades. Tap a team to edit it.</p>

      <details className="mb-8 rounded-2xl bg-board p-5 open:shadow-sm">
        <summary className="cursor-pointer font-display text-xl font-semibold">Add a team</summary>
        <form action={saveTeam} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="seasonId" value={data.season.id} />
          <label><span className="mb-1 block text-sm text-ink-soft">Team name</span><input name="name" className="field" required /></label>
          <label><span className="mb-1 block text-sm text-ink-soft">Manager</span><input name="manager" className="field" required /></label>
          <label><span className="mb-1 block text-sm text-ink-soft">Draft order</span><input name="draftOrder" type="number" min={1} className="field" /></label>
          <label><span className="mb-1 block text-sm text-ink-soft">Flag image</span><input name="flag" type="file" accept="image/*" className="field" /></label>
          {slots.map((s) => (
            <label key={s}><span className="mb-1 block text-sm text-ink-soft">Slot {s} pick</span><MarbleSelect name={`slot${s}`} marbles={data.competing} label={`Slot ${s} pick`} /></label>
          ))}
          <div className="sm:col-span-2"><Submit>Add team</Submit></div>
        </form>
      </details>

      <div className="space-y-2">
        {teams.map((t) => (
          <details key={t.id} className="group rounded-2xl bg-board open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <Flag src={t.flag} name={t.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                <span className="block truncate text-sm text-ink-soft">{t.manager}</span>
              </span>
              <span className="flex flex-none items-center gap-1">
                {t.current.map((m, k) => <Marble key={k} m={m} size={22} />)}
              </span>
              <svg className="flex-none text-ink-faint transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="border-t border-frost p-4 sm:p-5">
            <form action={saveTeam} className="grid items-end gap-3 md:grid-cols-[auto_1fr_1fr_7rem_auto]">
              <input type="hidden" name="id" value={t.id} />
              <Flag src={t.flag} name={t.name} size={56} className="hidden md:block" />
              <label><span className="mb-1 block text-sm text-ink-soft">Team name</span><input name="name" defaultValue={t.name} className="field" required /></label>
              <label><span className="mb-1 block text-sm text-ink-soft">Manager</span><input name="manager" defaultValue={t.manager} className="field" /></label>
              <label><span className="mb-1 block text-sm text-ink-soft">Draft order</span><input name="draftOrder" type="number" min={1} defaultValue={t.draftOrder ?? ""} className="field" /></label>
              <div className="order-last md:order-none"><Submit>Save</Submit></div>
              <label className="md:col-start-2"><span className="mb-1 block text-sm text-ink-soft">Replace flag</span><input name="flag" type="file" accept="image/*" className="field text-sm" /></label>
              {t.flag && <label className="flex items-center gap-2 self-center pt-5 text-sm text-ink-soft"><input type="checkbox" name="removeFlag" /> Remove flag</label>}
            </form>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {slots.map((s) => {
                const picks = t.picks.filter((p) => p.slot === s).sort((a, b) => a.startEvent - b.startEvent);
                return (
                  <div key={s} className="rounded-xl bg-ice p-4">
                    <h3 className="mb-2 text-sm font-semibold text-ink-soft">Slot {s}</h3>
                    <ul className="space-y-1">
                      {picks.map((p, i) => {
                        const m = data.marbles.get(p.marbleId);
                        return (
                          <li key={p.id} className="flex items-center gap-2 text-[15px]">
                            <Marble m={m} size={20} />
                            <span className="flex-1">{m?.name} <span className="text-ink-faint">{i === 0 && p.startEvent === 1 ? "drafted" : `from event ${p.startEvent}`}</span></span>
                            {picks.length > 1 && (
                              <form action={deletePick}>
                                <input type="hidden" name="id" value={p.id} />
                                <Submit className="text-xs text-ink-faint hover:text-redline" pendingText="…" confirm="Remove this pick?">Remove</Submit>
                              </form>
                            )}
                          </li>
                        );
                      })}
                      {picks.length === 0 && <li className="text-sm text-ink-faint">No pick yet.</li>}
                    </ul>
                    <form action={setPick} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="teamId" value={t.id} />
                      <input type="hidden" name="slot" value={s} />
                      <span className="min-w-44 flex-1"><MarbleSelect name="marbleId" marbles={data.competing} label={`New marble for slot ${s}`} /></span>
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-soft">
                        from event
                        <input name="startEvent" type="number" min={1} max={data.season.eventCount} defaultValue={picks.length ? Math.min(nextEvent, data.season.eventCount) : 1} className="field w-16" />
                      </label>
                      <Submit className="btn btn-quiet" pendingText="…">{picks.length ? "Trade" : "Set"}</Submit>
                    </form>
                  </div>
                );
              })}
            </div>
            <form action={deleteTeam} className="mt-3 text-right">
              <input type="hidden" name="id" value={t.id} />
              <Submit className="text-sm text-ink-faint hover:text-redline" pendingText="Deleting…" confirm={`Delete ${t.name} and all its picks?`}>Delete team</Submit>
            </form>
            </div>
          </details>
        ))}
      </div>
    </AdminShell>
  );
}
