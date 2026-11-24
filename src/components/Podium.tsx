import type { Marble as M, ResultRow } from "@/lib/season";
import { Marble, MarbleLink } from "./Marble";

const MEDAL = ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"];

/** Top three of an event on a podium: 2nd, 1st, 3rd. "sm" fits inside an event card (no links, so the card can be one). */
export function Podium({ rows, marbles, q = "", size = "lg" }: { rows: ResultRow[]; marbles: Map<number, M>; q?: string; size?: "lg" | "sm" }) {
  const top = rows.slice(0, 3);
  const lg = size === "lg";
  const heights = lg ? [132, 104, 84] : [34, 26, 20];
  const marbleSize = lg ? [64, 52, 52] : [28, 24, 24];
  return (
    <ol className={`flex items-end ${lg ? "gap-3" : "gap-1.5"}`} aria-label="Podium">
      {[1, 0, 2].map((idx) => {
        const r = top[idx];
        if (!r) return <li key={idx} className="flex-1" />;
        const m = marbles.get(r.marbleId)!;
        return (
          <li key={idx} className={`flex min-w-0 flex-1 flex-col items-center ${lg ? "gap-2" : "gap-1"}`}>
            {lg ? (
              <MarbleLink m={m} q={q} size={marbleSize[idx]} className="flex-col">
                <span className="text-center text-sm font-semibold leading-tight hover:underline">{m.name}</span>
              </MarbleLink>
            ) : (
              <>
                <Marble m={m} size={marbleSize[idx]} />
                <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-ink-soft">{m.name}</span>
              </>
            )}
            <span
              className={`flex w-full items-start justify-center num font-bold text-white ${lg ? "rounded-t-xl pt-2 text-3xl" : "rounded-t-md pt-0.5 text-sm"}`}
              style={{ height: heights[idx], background: MEDAL[idx] }}
            >
              {idx + 1}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
