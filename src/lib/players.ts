import { db } from "./db";
import { listSeasons, loadSeason, type SeasonData } from "./season";

export type Career = {
  seasonYear: number;
  seasonName: string;
  isCurrent: boolean;
  finished: boolean;
  completed: number;
  eventCount: number;
  teamId: number;
  teamName: string;
  flag: string | null;
  rank: number;
  teams: number;
  points: number;
};

export type PlayerSummary = { id: number; name: string; careers: Career[]; titles: number; bestFinish: number | null; seasons: number };

/** Loads every season once and works out each player's record in it. */
export function allPlayers(): PlayerSummary[] {
  const d = db();
  const players = d.prepare("SELECT id, name FROM players ORDER BY name").all() as { id: number; name: string }[];
  const seasons = listSeasons();
  const loaded = new Map<number, SeasonData>(seasons.map((s) => [s.id, loadSeason(s)]));
  const rows = d.prepare("SELECT id, season_id, player_id FROM league_teams WHERE player_id IS NOT NULL").all() as { id: number; season_id: number; player_id: number }[];

  return players.map((p) => {
    const careers: Career[] = rows
      .filter((r) => r.player_id === p.id)
      .map((r) => {
        const data = loaded.get(r.season_id)!;
        const t = data.teams.find((x) => x.id === r.id)!;
        return {
          seasonYear: data.season.year,
          seasonName: data.season.name,
          isCurrent: data.season.isCurrent,
          finished: data.completed.length >= data.season.eventCount && data.season.eventCount > 0,
          completed: data.completed.length,
          eventCount: data.season.eventCount,
          teamId: t.id,
          teamName: t.name,
          flag: t.flag,
          rank: t.rank,
          teams: data.teams.length,
          points: t.total,
        };
      })
      .sort((a, b) => b.seasonYear - a.seasonYear);
    const finished = careers.filter((c) => c.finished);
    return {
      id: p.id,
      name: p.name,
      careers,
      titles: finished.filter((c) => c.rank === 1).length,
      bestFinish: finished.length ? Math.min(...finished.map((c) => c.rank)) : null,
      seasons: careers.length,
    };
  });
}

export function getPlayer(id: number) {
  return allPlayers().find((p) => p.id === id) ?? null;
}
