"use client";
import { useMemo, useState } from "react";
import { Marble } from "../Marble";
import type { Marble as M } from "@/lib/season";
import { saveResults, clearResults } from "@/app/admin/actions";
import { Submit } from "./Submit";

type Row = { marbleId: number; placement: number | null; points: number };

export function ResultsEditor({ eventId, eventName, marbles, pointsTable, initial }: { eventId: number; eventName: string; marbles: M[]; pointsTable: number[]; initial: Row[] }) {
  const [order, setOrder] = useState<number[]>(() => [...initial].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)).map((r) => r.marbleId));
  const [overrides, setOverrides] = useState<Record<number, number>>(() => {
    const o: Record<number, number> = {};
    [...initial].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)).forEach((r, i) => {
      if (r.points !== (pointsTable[i] ?? 0)) o[r.marbleId] = r.points;
    });
    return o;
  });
  const byId = useMemo(() => new Map(marbles.map((m) => [m.id, m])), [marbles]);
  const pool = marbles.filter((m) => !order.includes(m.id));
  const pts = (id: number, i: number) => overrides[id] ?? pointsTable[i] ?? 0;
  const rows: Row[] = order.map((id, i) => ({ marbleId: id, placement: i + 1, points: pts(id, i) }));

  const move = (i: number, d: number) =>
    setOrder((o) => {
      const n = [...o];
      const j = i + d;
      if (j < 0 || j >= n.length) return o;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem] [&>*]:min-w-0">
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-display text-2xl font-bold">{eventName}: finishing order</h2>
          <span className="text-sm text-ink-faint">{order.length} of {marbles.length} placed</span>
        </div>
        {order.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-frost px-6 py-12 text-center text-ink-soft">
            Tap the marble teams in the order they finished. Points fill in from the season&apos;s points table, and you can edit any of them.
          </p>
        ) : (
          <ol className="overflow-hidden rounded-2xl bg-board">
            {order.map((id, i) => {
              const m = byId.get(id);
              return (
                <li key={id} className="flex items-center gap-2 border-b border-frost px-2 py-1.5 last:border-0 sm:gap-3 sm:px-3">
                  <span className="num w-7 text-right text-lg font-bold text-ink-soft">{i + 1}</span>
                  <Marble m={m} size={26} />
                  <span className="min-w-0 flex-1 truncate font-medium">{m?.name ?? "Removed team"}</span>
                  <label className="flex items-center gap-1 text-sm text-ink-faint">
                    <span className="sr-only">Points for {m?.name}</span>
                    <input
                      type="number"
                      className={`field num w-14 py-1 text-right text-lg sm:w-16 ${overrides[id] != null ? "border-gold" : ""}`}
                      value={pts(id, i)}
                      onChange={(e) => setOverrides((o) => ({ ...o, [id]: Number(e.target.value) }))}
                    />
                    <span className="hidden sm:inline">pts</span>
                  </label>
                  <span className="flex">
                    <button type="button" onClick={() => move(i, -1)} className="grid h-8 w-7 place-items-center rounded text-ink-soft hover:bg-ice disabled:opacity-30" disabled={i === 0} aria-label={`Move ${m?.name} up`}>&uarr;</button>
                    <button type="button" onClick={() => move(i, 1)} className="grid h-8 w-7 place-items-center rounded text-ink-soft hover:bg-ice disabled:opacity-30" disabled={i === order.length - 1} aria-label={`Move ${m?.name} down`}>&darr;</button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrder((o) => o.filter((x) => x !== id));
                        setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
                      }}
                      className="grid h-8 w-7 place-items-center rounded text-redline hover:bg-redline/10"
                      aria-label={`Remove ${m?.name}`}
                    >
                      &times;
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={saveResults}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            <Submit>Save results</Submit>
          </form>
          {Object.keys(overrides).length > 0 && (
            <button type="button" className="btn btn-quiet" onClick={() => setOverrides({})}>Reset points to the table</button>
          )}
          {initial.length > 0 && (
            <form action={clearResults} className="ml-auto">
              <input type="hidden" name="eventId" value={eventId} />
              <Submit className="btn btn-danger" pendingText="Clearing…" confirm={`Clear all results for ${eventName}?`}>Clear results</Submit>
            </form>
          )}
        </div>
      </div>
      <aside className="order-first lg:order-none">
        <h3 className="mb-2 text-sm font-medium text-ink-soft">{pool.length ? "Next to finish" : "Everyone's placed"}</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
          {pool.map((m) => (
            <button key={m.id} type="button" onClick={() => setOrder((o) => [...o, m.id])} className="flex min-h-10 items-center gap-2 rounded-lg bg-board px-2 py-1.5 text-left text-sm hover:bg-white hover:shadow-sm">
              <Marble m={m} size={22} />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
        </div>
        {marbles.length === 0 && <p className="text-sm text-ink-soft">No marble teams are competing this season. Add them under Marble teams.</p>}
      </aside>
    </div>
  );
}
