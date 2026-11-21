import { getSetting } from "./db";
import { loadSeason, resolveSeason, listSeasons } from "./season";

export async function pageData(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = await searchParams;
  const year = typeof sp.season === "string" ? sp.season : null;
  const season = resolveSeason(year);
  const leagueName = getSetting("leagueName", "Fantasy Marble League");
  return { leagueName, data: season ? loadSeason(season) : null, seasons: listSeasons(), q: season && !season.isCurrent ? `?season=${season.year}` : "" };
}

export function fmtDate(d: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!d) return null;
  const dt = new Date(d.length === 10 ? d + "T12:00:00" : d);
  return isNaN(+dt) ? null : dt.toLocaleDateString("en-US", opts);
}

export function ordinal(n: number) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return n + "st";
  if (j === 2 && k !== 12) return n + "nd";
  if (j === 3 && k !== 13) return n + "rd";
  return n + "th";
}
