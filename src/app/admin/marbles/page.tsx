import { adminData } from "@/lib/admin";
import { AdminShell, NoSeason } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Marble } from "@/components/Marble";
import { allMarbles, type Marble as M } from "@/lib/season";
import { saveMarble, setCompeting, deleteMarble } from "../actions";

export const dynamic = "force-dynamic";

function MarbleFields({ m }: { m?: M }) {
  return (
    <>
      <label><span className="mb-1 block text-sm text-ink-soft">Name</span><input name="name" defaultValue={m?.name} className="field" required /></label>
      <label><span className="mb-1 block text-sm text-ink-soft">Code</span><input name="code" defaultValue={m?.code} maxLength={4} className="field uppercase" required /></label>
      <label><span className="mb-1 block text-sm text-ink-soft">Colour</span><input name="color" type="color" defaultValue={m?.color ?? "#8899aa"} className="field h-10 p-1" /></label>
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="useColor2" defaultChecked={!!m?.color2} /> Swirl colour</label>
        <input name="color2" type="color" defaultValue={m?.color2 ?? "#ffffff"} className="field h-10 p-1" aria-label="Swirl colour" />
      </div>
      <label className="sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Wiki link</span><input name="wikiLink" type="url" defaultValue={m?.wikiLink ?? ""} className="field" /></label>
      <label className="sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">{m?.flag ? "Replace logo" : "Logo (optional, shown inside the marble)"}</span><input name="flag" type="file" accept="image/*" className="field text-sm" /></label>
      {m?.flag && <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="removeFlag" /> Remove logo</label>}
    </>
  );
}

export default async function AdminMarbles({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons, data } = await adminData(searchParams);
  if (!data) return <AdminShell active="/admin/marbles" season={season} seasons={seasons}><NoSeason /></AdminShell>;
  const competing = new Set(data.competing.map((m) => m.id));
  const all = allMarbles().sort((a, b) => Number(competing.has(b.id)) - Number(competing.has(a.id)) || a.name.localeCompare(b.name));
  return (
    <AdminShell active="/admin/marbles" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Marble teams</h1>
      <p className="mb-6 mt-1 text-ink-soft">{competing.size} competing in {data.season.name}. Teams are shared across seasons; tick the ones racing this year.</p>

      <details className="mb-6 rounded-2xl bg-board p-5">
        <summary className="cursor-pointer font-display text-xl font-semibold">Add a marble team</summary>
        <form action={saveMarble} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="seasonId" value={data.season.id} />
          <MarbleFields />
          <div className="sm:col-span-4"><Submit>Add marble team</Submit></div>
        </form>
      </details>

      <ul className="grid gap-2 md:grid-cols-2">
        {all.map((m) => {
          const on = competing.has(m.id);
          return (
            <li key={m.id} className={`rounded-xl bg-board ${on ? "" : "opacity-70"}`}>
              <div className="flex items-center gap-3 p-3">
                <Marble m={m} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{m.name}</div>
                  <div className="text-sm text-ink-faint">{m.code}</div>
                </div>
                <form action={setCompeting}>
                  <input type="hidden" name="seasonId" value={data.season.id} />
                  <input type="hidden" name="marbleId" value={m.id} />
                  <input type="hidden" name="on" value={on ? "0" : "1"} />
                  <Submit className={`rounded-full px-3 py-1 text-sm font-semibold ${on ? "bg-ink text-white" : "bg-ice text-ink-soft hover:text-ink"}`} pendingText="…">
                    {on ? "Competing" : "Not competing"}
                  </Submit>
                </form>
              </div>
              <details className="border-t border-frost px-3 py-2">
                <summary className="cursor-pointer text-sm text-ink-soft">Edit</summary>
                <form action={saveMarble} className="mt-3 grid gap-3 sm:grid-cols-4">
                  <input type="hidden" name="id" value={m.id} />
                  <MarbleFields m={m} />
                  <div className="flex items-center justify-between sm:col-span-4"><Submit>Save</Submit></div>
                </form>
                <form action={deleteMarble} className="mt-2 text-right">
                  <input type="hidden" name="id" value={m.id} />
                  <Submit className="text-xs text-ink-faint hover:text-redline" pendingText="Deleting…" confirm={`Delete ${m.name} everywhere, including its results and any picks of it?`}>Delete marble team</Submit>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
