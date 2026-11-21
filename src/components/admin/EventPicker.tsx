"use client";
import { useRouter } from "next/navigation";

/** Phone-sized event switcher for the results page. */
export function EventPicker({ events, current, yq }: { events: { no: number; name: string; done: boolean }[]; current: number; yq: string }) {
  const router = useRouter();
  return (
    <label className="block min-w-0 md:hidden">
      <span className="mb-1 block text-sm text-ink-soft">Event</span>
      <select className="field min-w-0 truncate" value={current} onChange={(e) => router.push(`/admin?event=${e.target.value}${yq}`)}>
        {events.map((e) => (
          <option key={e.no} value={e.no}>
            {e.no}. {e.name}{e.done ? " (has results)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
