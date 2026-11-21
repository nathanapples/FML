import { requireAdmin } from "./auth";
import { listSeasons, loadSeason, resolveSeason } from "./season";

export async function adminData(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  await requireAdmin();
  const sp = await searchParams;
  const season = resolveSeason(typeof sp.season === "string" ? sp.season : null);
  return { sp, season, seasons: listSeasons(), data: season ? loadSeason(season) : null };
}
