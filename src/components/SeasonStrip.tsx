import Link from "next/link";
import type { SeasonData } from "@/lib/season";
import { Marble } from "./Marble";

/** One marble per event: filled with the event winner's colours once raced, an empty track slot otherwise. */
export function SeasonStrip({ data, q, size = 26 }: { data: SeasonData; q: string; size?: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Season progress">
      {data.events.map((e) => {
        const winner = e.completed ? data.marbles.get(data.results.get(e.no)![0].marbleId) : null;
        const label = e.completed ? `Event ${e.no}: ${e.name}, won by ${winner?.name}` : `Event ${e.no}: ${e.name}, not raced yet`;
        return (
          <li key={e.no}>
            <Link href={`/events/${e.no}${q}`} title={label} aria-label={label} className="group relative grid place-items-center">
              {winner ? (
                <Marble m={winner} size={size} title={label} className="transition-transform group-hover:-translate-y-0.5" />
              ) : (
                <span
                  className="grid place-items-center rounded-full text-[11px] font-semibold text-ink-faint shadow-[inset_0_2px_4px_rgb(11_42_74_/_0.18)] bg-frost group-hover:text-ink"
                  style={{ width: size, height: size }}
                >
                  {e.no}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
