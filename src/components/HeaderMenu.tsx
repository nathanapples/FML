"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Where a season switch should land: list pages keep their place, detail pages go up to their list. */
function seasonHref(path: string, year: number, isCurrent: boolean) {
  const base = path.startsWith("/events/") ? "/events" : path.startsWith("/marbles/") ? "/marbles" : path.startsWith("/teams/") || path.startsWith("/players") ? "/" : path;
  return isCurrent ? base : `${base}?season=${year}`;
}

/** The header menu: season picker and Admin, with room for each player's own items later. */
export function HeaderMenu({ seasons, current }: { seasons: { year: number; name: string; isCurrent: boolean }[]; current: number | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1.5 rounded-lg py-1.5 pl-2.5 pr-2 text-[15px] font-semibold text-ink transition-colors ${open ? "bg-white shadow-sm" : "hover:bg-white"}`}
      >
        {current != null && <span className="num hidden text-base min-[400px]:inline">{current}</span>}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="sr-only">Menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgb(11_42_74_/_0.45)] ring-1 ring-frost">
          {seasons.length > 0 && (
            <>
              <div className="px-2.5 pb-1 pt-1.5 text-sm text-ink-faint">Season</div>
              {seasons.map((s) => (
                <Link
                  key={s.year}
                  role="menuitemradio"
                  aria-checked={s.year === current}
                  href={seasonHref(path, s.year, s.isCurrent)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] hover:bg-ice ${s.year === current ? "font-semibold text-ink" : "text-ink-soft"}`}
                >
                  <span className="num w-11 text-base">{s.year}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-faint">{s.isCurrent ? "Current" : ""}</span>
                  {s.year === current && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blueline" aria-hidden><path d="M5 12l5 5L19 7" /></svg>
                  )}
                </Link>
              ))}
              <div className="mx-2 my-1.5 border-t border-frost" />
            </>
          )}
          <Link role="menuitem" href="/admin" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] text-ink-soft hover:bg-ice hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Admin
          </Link>
        </div>
      )}
    </div>
  );
}
