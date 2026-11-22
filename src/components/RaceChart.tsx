"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RaceTeam = { id: number; name: string; manager: string; color: string; running: number[]; ranks: number[] };

export function RaceChart({ events, teams }: { events: { no: number; name: string }[]; teams: RaceTeam[] }) {
  const [mode, setMode] = useState<"points" | "rank">("points");
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<Set<number>>(new Set());

  const rows = useMemo(() => {
    const start: Record<string, number | string> = { label: "Start" };
    teams.forEach((t) => (start[`t${t.id}`] = mode === "points" ? 0 : NaN));
    const r = events.map((e, i) => {
      const row: Record<string, number | string> = { label: e.name, no: e.no };
      teams.forEach((t) => (row[`t${t.id}`] = mode === "points" ? t.running[i] : t.ranks[i]));
      return row;
    });
    return mode === "points" ? [start, ...r] : r;
  }, [events, teams, mode]);

  const focus = hover != null ? new Set([hover]) : pinned;
  const dim = (id: number) => focus.size > 0 && !focus.has(id);
  const toggle = (id: number) =>
    setPinned((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  if (events.length === 0) return <p className="py-12 text-center text-ink-soft">The race chart fills in once the first event has results.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
      <div>
        <div className="mb-3 inline-flex rounded-lg bg-ice p-0.5 text-sm" role="group" aria-label="Chart mode">
          {(["points", "rank"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1 font-medium ${mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {m === "points" ? "Total points" : "League position"}
            </button>
          ))}
        </div>
        <div className="h-[380px] sm:h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid stroke="#dfe8ee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4a6380" }} tickLine={false} axisLine={{ stroke: "#dfe8ee" }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis
                reversed={mode === "rank"}
                domain={mode === "rank" ? [1, teams.length] : [0, "auto"]}
                allowDecimals={false}
                ticks={mode === "rank" ? teams.map((_, i) => i + 1) : undefined}
                tick={{ fontSize: 12, fill: "#4a6380" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                allowEscapeViewBox={{ x: false, y: true }}
                wrapperStyle={{ zIndex: 20, maxWidth: "calc(100vw - 2rem)" }}
                cursor={{ stroke: "#8aa0b4", strokeDasharray: "3 3" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const list = [...payload].sort((a, b) => (mode === "rank" ? Number(a.value) - Number(b.value) : Number(b.value) - Number(a.value)));
                  return (
                    <div className="w-[min(18rem,calc(100vw-3rem))] rounded-xl bg-ink/95 px-3 py-2 text-[13px] text-white shadow-xl">
                      <div className="mb-1 font-display text-base font-semibold">{label}</div>
                      {list.map((p) => {
                        const t = teams.find((x) => `t${x.id}` === p.dataKey)!;
                        return (
                          <div key={t.id} className={`flex items-center justify-between gap-4 ${dim(t.id) ? "opacity-40" : ""}`}>
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 flex-none rounded-full" style={{ background: t.color }} />
                              <span className="truncate">{t.name}</span>
                            </span>
                            <span className="num font-semibold">{mode === "rank" ? `#${p.value}` : p.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {teams.map((t) => (
                <Line
                  key={t.id}
                  type="monotone"
                  dataKey={`t${t.id}`}
                  name={t.name}
                  stroke={t.color}
                  strokeWidth={focus.has(t.id) ? 3.5 : 2}
                  strokeOpacity={dim(t.id) ? 0.12 : 1}
                  dot={false}
                  activeDot={dim(t.id) ? false : { r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 self-start text-sm sm:grid-cols-3 lg:grid-cols-1" onMouseLeave={() => setHover(null)}>
        {teams.map((t) => (
          <li key={t.id}>
            <button
              onMouseEnter={() => setHover(t.id)}
              onFocus={() => setHover(t.id)}
              onBlur={() => setHover(null)}
              onClick={() => toggle(t.id)}
              aria-pressed={pinned.has(t.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-opacity ${dim(t.id) ? "opacity-40" : ""} ${pinned.has(t.id) ? "bg-ice font-semibold" : "hover:bg-ice"}`}
            >
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: t.color }} />
              <span className="truncate">{t.name}</span>
            </button>
          </li>
        ))}
        {pinned.size > 0 && (
          <li>
            <button onClick={() => setPinned(new Set())} className="px-2 py-1 text-ink-faint hover:text-ink">Show all teams</button>
          </li>
        )}
      </ul>
    </div>
  );
}
