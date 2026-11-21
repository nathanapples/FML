import Link from "next/link";
import { adminData } from "@/lib/admin";
import { AdminShell, NoSeason } from "@/components/admin/AdminShell";
import { ResultsEditor } from "@/components/admin/ResultsEditor";
import { Marble } from "@/components/Marble";
import { fmtDate } from "@/lib/page";

export const dynamic = "force-dynamic";

export default async function AdminResults({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sp, season, seasons, data } = await adminData(searchParams);
  if (!data) return <AdminShell active="/admin" season={season} seasons={seasons}><NoSeason /></AdminShell>;
  const firstOpen = data.events.find((e) => !e.completed) ?? data.events[data.events.length - 1];
  const sel = data.events.find((e) => String(e.no) === sp.event) ?? firstOpen;
  const yq = season && !season.isCurrent ? `&season=${season.year}` : "";
  return (
    <AdminShell active="/admin" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Results</h1>
      <p className="mb-6 mt-1 text-ink-soft">Pick an event, then enter the finishing order. Standings update as soon as you save.</p>
      <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
        <ol className="space-y-1">
          {data.events.map((e) => {
            const w = e.completed ? data.marbles.get(data.results.get(e.no)![0].marbleId) : null;
            return (
              <li key={e.id}>
                <Link
                  href={`/admin?event=${e.no}${yq}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[15px] ${sel?.id === e.id ? "bg-ink text-white" : "hover:bg-board"}`}
                >
                  <span className="num w-5 text-right opacity-60">{e.no}</span>
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  {w ? <Marble m={w} size={16} /> : <span className="text-xs opacity-50">{fmtDate(e.date) ?? ""}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
        {sel ? (
          <ResultsEditor
            key={sel.id}
            eventId={sel.id}
            eventName={sel.name}
            marbles={data.competing}
            pointsTable={data.season.pointsTable}
            initial={data.results.get(sel.no) ?? []}
          />
        ) : (
          <p className="text-ink-soft">This season has no events. Add some under Events.</p>
        )}
      </div>
    </AdminShell>
  );
}
