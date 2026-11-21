import { db, DEFAULT_POINTS } from "./db";

export type Marble = { id: number; code: string; name: string; color: string; color2: string | null; flag: string | null; wikiLink: string | null };
export type SeasonRow = { id: number; year: number; name: string; eventCount: number; slotsPerTeam: number; pointsTable: number[]; isCurrent: boolean };
export type EventInfo = { id: number; no: number; name: string; date: string | null; wikiLink: string | null; videoLink: string | null; completed: boolean };
export type Pick = { id: number; slot: number; marbleId: number; startEvent: number };
export type SlotScore = { slot: number; marble: Marble | null; points: number };
export type TeamEvent = { eventNo: number; slots: SlotScore[]; total: number; running: number; rank: number };
export type TeamStanding = {
  id: number;
  name: string;
  manager: string;
  flag: string | null;
  draftOrder: number | null;
  picks: Pick[];
  current: (Marble | null)[];
  events: TeamEvent[];
  total: number;
  rank: number;
  prevRank: number | null;
  lastEventPoints: number | null;
  gap: number;
  color: string;
};
export type MarbleStanding = { marble: Marble; points: number[]; total: number; rank: number; gold: number; silver: number; bronze: number; owners: number };
export type ResultRow = { marbleId: number; placement: number | null; points: number };

export type SeasonData = {
  season: SeasonRow;
  seasons: SeasonRow[];
  marbles: Map<number, Marble>;
  competing: Marble[];
  events: EventInfo[];
  completed: EventInfo[];
  lastEvent: EventInfo | null;
  results: Map<number, ResultRow[]>; // eventNo -> rows
  teams: TeamStanding[];
  marbleStandings: MarbleStanding[];
  stats: {
    closest: { a: TeamStanding; b: TeamStanding; gap: number; position: number } | null;
    spread: number;
    bestHaul: { team: TeamStanding; event: EventInfo; points: number } | null;
    lastTop: { team: TeamStanding; points: number }[];
  };
};

/** Hand-tuned categorical palette for league teams (distinct on the ice background). */
const TEAM_PALETTE = [
  "#1F5FAE", "#D7263D", "#E3A92B", "#2A9D8F", "#7B4FC9", "#F2711C", "#0B2A4A", "#C2185B",
  "#5E8C31", "#00A6D6", "#8C5A3C", "#9AA0A6", "#B5179E", "#2F855A", "#E76F51", "#264653",
];

export function rowToSeason(r: Record<string, unknown>): SeasonRow {
  return {
    id: r.id as number,
    year: r.year as number,
    name: r.name as string,
    eventCount: r.event_count as number,
    slotsPerTeam: r.slots_per_team as number,
    pointsTable: (() => {
      try { return JSON.parse(r.points_table as string) as number[]; } catch { return DEFAULT_POINTS; }
    })(),
    isCurrent: !!r.is_current,
  };
}

export function listSeasons(): SeasonRow[] {
  return (db().prepare("SELECT * FROM seasons ORDER BY year DESC, id DESC").all() as Record<string, unknown>[]).map(rowToSeason);
}

export function resolveSeason(year?: string | null): SeasonRow | null {
  const seasons = listSeasons();
  if (year) {
    const s = seasons.find((x) => String(x.year) === String(year));
    if (s) return s;
  }
  return seasons.find((s) => s.isCurrent) ?? seasons[0] ?? null;
}

export function allMarbles(): Marble[] {
  return (db().prepare("SELECT * FROM marble_teams ORDER BY name").all() as Record<string, unknown>[]).map(rowToMarble);
}
function rowToMarble(r: Record<string, unknown>): Marble {
  return { id: r.id as number, code: r.code as string, name: r.name as string, color: r.color as string, color2: (r.color2 as string) || null, flag: (r.flag as string) || null, wikiLink: (r.wiki_link as string) || null };
}

/** Competition ranking: equal totals share a rank (1, 2, 2, 4). */
function rank<T>(items: T[], score: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const out = new Map<T, number>();
  sorted.forEach((t, i) => out.set(t, i > 0 && score(sorted[i - 1]) === score(t) ? out.get(sorted[i - 1])! : i + 1));
  return out;
}

export function loadSeason(season: SeasonRow): SeasonData {
  const d = db();
  const marbles = new Map(allMarbles().map((m) => [m.id, m]));
  const competing = (d.prepare("SELECT marble_id FROM season_marbles WHERE season_id=?").all(season.id) as { marble_id: number }[])
    .map((r) => marbles.get(r.marble_id)!)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  const evRows = d.prepare("SELECT * FROM events WHERE season_id=? ORDER BY event_no").all(season.id) as Record<string, unknown>[];
  const resRows = d.prepare("SELECT r.*, e.event_no FROM results r JOIN events e ON e.id=r.event_id WHERE e.season_id=?").all(season.id) as Record<string, unknown>[];
  const results = new Map<number, ResultRow[]>();
  for (const r of resRows) {
    const no = r.event_no as number;
    if (!results.has(no)) results.set(no, []);
    results.get(no)!.push({ marbleId: r.marble_id as number, placement: (r.placement as number) ?? null, points: r.points as number });
  }
  for (const rows of results.values()) rows.sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99) || b.points - a.points);

  const events: EventInfo[] = evRows.map((e) => ({
    id: e.id as number,
    no: e.event_no as number,
    name: e.name as string,
    date: (e.date as string) || null,
    wikiLink: (e.wiki_link as string) || null,
    videoLink: (e.video_link as string) || null,
    completed: (results.get(e.event_no as number)?.length ?? 0) > 0,
  }));
  const completed = events.filter((e) => e.completed);
  const lastEvent = completed[completed.length - 1] ?? null;
  const pts = (eventNo: number, marbleId: number | undefined) =>
    marbleId == null ? 0 : results.get(eventNo)?.find((r) => r.marbleId === marbleId)?.points ?? 0;

  const teamRows = d.prepare("SELECT * FROM league_teams WHERE season_id=? ORDER BY COALESCE(draft_order,999), name").all(season.id) as Record<string, unknown>[];
  const pickRows = d.prepare("SELECT p.* FROM picks p JOIN league_teams t ON t.id=p.league_team_id WHERE t.season_id=? ORDER BY slot, start_event").all(season.id) as Record<string, unknown>[];

  const teams: TeamStanding[] = teamRows.map((t, i) => {
    const picks: Pick[] = pickRows
      .filter((p) => p.league_team_id === t.id)
      .map((p) => ({ id: p.id as number, slot: p.slot as number, marbleId: p.marble_id as number, startEvent: p.start_event as number }));
    const activeFor = (slot: number, eventNo: number) =>
      picks.filter((p) => p.slot === slot && p.startEvent <= eventNo).sort((a, b) => b.startEvent - a.startEvent)[0];
    let running = 0;
    const evs: TeamEvent[] = events.map((e) => {
      const slots: SlotScore[] = [];
      for (let s = 1; s <= season.slotsPerTeam; s++) {
        const p = activeFor(s, e.no);
        slots.push({ slot: s, marble: p ? marbles.get(p.marbleId) ?? null : null, points: e.completed ? pts(e.no, p?.marbleId) : 0 });
      }
      const total = slots.reduce((a, b) => a + b.points, 0);
      running += total;
      return { eventNo: e.no, slots, total, running, rank: 0 };
    });
    const nextNo = (lastEvent?.no ?? 0) + 1;
    const current = Array.from({ length: season.slotsPerTeam }, (_, k) => {
      const p = activeFor(k + 1, Math.min(nextNo, season.eventCount)) ?? activeFor(k + 1, 9999);
      return p ? marbles.get(p.marbleId) ?? null : null;
    });
    return {
      id: t.id as number,
      name: t.name as string,
      manager: t.manager as string,
      flag: (t.flag as string) || null,
      draftOrder: (t.draft_order as number) ?? null,
      picks,
      current,
      events: evs,
      total: running,
      rank: 0,
      prevRank: null,
      lastEventPoints: lastEvent ? evs.find((x) => x.eventNo === lastEvent.no)!.total : null,
      gap: 0,
      color: TEAM_PALETTE[i % TEAM_PALETTE.length],
    };
  });

  // rank after each event
  for (const e of events) {
    const r = rank(teams, (t) => t.events.find((x) => x.eventNo === e.no)!.running);
    for (const t of teams) t.events.find((x) => x.eventNo === e.no)!.rank = r.get(t)!;
  }
  const finalRank = rank(teams, (t) => t.total);
  const prev = completed.length >= 2 ? completed[completed.length - 2] : null;
  for (const t of teams) {
    t.rank = finalRank.get(t)!;
    t.prevRank = prev ? t.events.find((x) => x.eventNo === prev.no)!.rank : null;
  }
  teams.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const leader = teams[0]?.total ?? 0;
  for (const t of teams) t.gap = leader - t.total;

  // marble standings
  const ownerCount = (mid: number) => teams.filter((t) => t.current.some((m) => m?.id === mid)).length;
  const ms = competing.map((m) => {
    const points = events.map((e) => pts(e.no, m.id));
    const placements = completed.map((e) => results.get(e.no)?.find((r) => r.marbleId === m.id)?.placement ?? null);
    return {
      marble: m,
      points,
      total: points.reduce((a, b) => a + b, 0),
      rank: 0,
      gold: placements.filter((p) => p === 1).length,
      silver: placements.filter((p) => p === 2).length,
      bronze: placements.filter((p) => p === 3).length,
      owners: ownerCount(m.id),
    };
  });
  const mr = rank(ms, (m) => m.total);
  ms.forEach((m) => (m.rank = mr.get(m)!));
  ms.sort((a, b) => a.rank - b.rank || b.gold - a.gold || a.marble.name.localeCompare(b.marble.name));

  // stats
  let closest: SeasonData["stats"]["closest"] = null;
  for (let i = 1; i < teams.length; i++) {
    const gap = teams[i - 1].total - teams[i].total;
    if (!closest || gap < closest.gap) closest = { a: teams[i - 1], b: teams[i], gap, position: i };
  }
  let bestHaul: SeasonData["stats"]["bestHaul"] = null;
  for (const t of teams)
    for (const e of t.events) {
      const ev = events.find((x) => x.no === e.eventNo)!;
      if (ev.completed && (!bestHaul || e.total > bestHaul.points)) bestHaul = { team: t, event: ev, points: e.total };
    }
  const lastTop = lastEvent
    ? (() => {
        const max = Math.max(...teams.map((t) => t.lastEventPoints ?? 0));
        return teams.filter((t) => t.lastEventPoints === max).map((t) => ({ team: t, points: max }));
      })()
    : [];

  return {
    season,
    seasons: listSeasons(),
    marbles,
    competing,
    events,
    completed,
    lastEvent,
    results,
    teams,
    marbleStandings: ms,
    stats: {
      closest: teams.length > 1 ? closest : null,
      spread: teams.length ? teams[0].total - teams[teams.length - 1].total : 0,
      bestHaul,
      lastTop,
    },
  };
}
