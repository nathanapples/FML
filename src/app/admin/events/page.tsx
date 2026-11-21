import { adminData } from "@/lib/admin";
import { AdminShell, NoSeason } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { saveEvent, addEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminEvents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons, data } = await adminData(searchParams);
  if (!data) return <AdminShell active="/admin/events" season={season} seasons={seasons}><NoSeason /></AdminShell>;
  return (
    <AdminShell active="/admin/events" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Events</h1>
      <p className="mb-6 mt-1 text-ink-soft">Names, dates and links for each event in {data.season.name}.</p>
      <div className="space-y-2">
        <div className="hidden grid-cols-[2rem_1fr_10rem_1fr_1fr_auto] gap-2 px-3 text-sm text-ink-faint lg:grid">
          <span>#</span><span>Name</span><span>Date</span><span>Wiki link</span><span>Video link</span><span />
        </div>
        {data.events.map((e) => (
          <div key={e.id} className="rounded-xl bg-board p-3">
            <form action={saveEvent} className="grid grid-cols-[2rem_1fr] items-center gap-2 lg:grid-cols-[2rem_1fr_10rem_1fr_1fr_auto]">
              <input type="hidden" name="id" value={e.id} />
              <span className="num text-xl font-bold text-ink-faint">{e.no}</span>
              <input name="name" defaultValue={e.name} className="field" aria-label="Event name" required />
              <input name="date" type="date" defaultValue={e.date ?? ""} className="field col-start-2 lg:col-auto" aria-label="Date" />
              <input name="wikiLink" type="url" defaultValue={e.wikiLink ?? ""} placeholder="https://…" className="field col-start-2 lg:col-auto" aria-label="Wiki link" />
              <input name="videoLink" type="url" defaultValue={e.videoLink ?? ""} placeholder="https://youtube.com/…" className="field col-start-2 lg:col-auto" aria-label="Video link" />
              <span className="col-start-2 flex gap-2 lg:col-auto">
                <Submit className="btn">Save</Submit>
              </span>
            </form>
            {!e.completed && (
              <form action={deleteEvent} className="mt-1 text-right">
                <input type="hidden" name="id" value={e.id} />
                <Submit className="text-xs text-ink-faint hover:text-redline" pendingText="Removing…" confirm={`Remove ${e.name}? Later events will be renumbered.`}>Remove event</Submit>
              </form>
            )}
          </div>
        ))}
      </div>
      <form action={addEvent} className="mt-4">
        <input type="hidden" name="seasonId" value={data.season.id} />
        <Submit className="btn btn-quiet" pendingText="Adding…">Add an event</Submit>
      </form>
    </AdminShell>
  );
}
