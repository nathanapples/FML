import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const FLAG_DIR = path.join(DATA_DIR, "flags");
const SEED_DIR = process.env.SEED_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "seed");

export const DEFAULT_POINTS = [25, 20, 15, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 16,
  slots_per_team INTEGER NOT NULL DEFAULT 2,
  points_table TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS marble_teams (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8899aa',
  color2 TEXT,
  flag TEXT,
  wiki_link TEXT
);
CREATE TABLE IF NOT EXISTS season_marbles (
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  marble_id INTEGER NOT NULL REFERENCES marble_teams(id) ON DELETE CASCADE,
  PRIMARY KEY (season_id, marble_id)
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  event_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  date TEXT,
  wiki_link TEXT,
  video_link TEXT,
  counts INTEGER NOT NULL DEFAULT 1,
  UNIQUE (season_id, event_no)
);
CREATE TABLE IF NOT EXISTS results (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  marble_id INTEGER NOT NULL REFERENCES marble_teams(id) ON DELETE CASCADE,
  placement INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, marble_id)
);
CREATE TABLE IF NOT EXISTS league_teams (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manager TEXT NOT NULL DEFAULT '',
  flag TEXT,
  draft_order INTEGER
);
CREATE TABLE IF NOT EXISTS picks (
  id INTEGER PRIMARY KEY,
  league_team_id INTEGER NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL,
  marble_id INTEGER NOT NULL REFERENCES marble_teams(id) ON DELETE CASCADE,
  start_event INTEGER NOT NULL DEFAULT 1,
  UNIQUE (league_team_id, slot, start_event)
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __fmlDb: Database.Database | undefined;
}

export function db(): Database.Database {
  if (globalThis.__fmlDb) return globalThis.__fmlDb;
  fs.mkdirSync(FLAG_DIR, { recursive: true });
  const d = new Database(path.join(DATA_DIR, "fml.db"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  migrate(d);
  globalThis.__fmlDb = d;
  const count = (d.prepare("SELECT COUNT(*) c FROM seasons").get() as { c: number }).c;
  const seeded = d.prepare("SELECT value FROM settings WHERE key='seeded'").get();
  if (count === 0 && !seeded && process.env.SEED !== "false") seed(d);
  return d;
}

/** Adds columns introduced after a database was first created. */
function migrate(d: Database.Database) {
  const cols = (d.prepare("PRAGMA table_info(events)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("counts")) d.exec("ALTER TABLE events ADD COLUMN counts INTEGER NOT NULL DEFAULT 1");
}

export function getSetting(key: string, fallback = ""): string {
  const r = db().prepare("SELECT value FROM settings WHERE key=?").get(key) as { value: string } | undefined;
  return r?.value ?? fallback;
}
export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}

/* ---------- seed / import ---------- */

export type SeasonFile = {
  year: number;
  name: string;
  eventCount: number;
  slotsPerTeam: number;
  pointsTable: number[];
  isCurrent?: boolean;
  marbleTeams: { code: string; name: string; color: string; color2?: string | null; wikiLink?: string | null; flag?: string | null; competing: boolean }[];
  events: { eventNo: number; name: string; date?: string | null; wikiLink?: string | null; videoLink?: string | null; counts?: boolean }[];
  results: Record<string, Record<string, number | { points: number; placement?: number | null }>>;
  leagueTeams: { teamName: string; manager: string; draftOrder?: number | null; flag?: string | null; slots: { code: string; startEvent: number }[][] }[];
};

export function importSeason(d: Database.Database, s: SeasonFile): number {
  const tx = d.transaction(() => {
    const upMarble = d.prepare(
      `INSERT INTO marble_teams(code,name,color,color2,flag,wiki_link) VALUES(@code,@name,@color,@color2,@flag,@wiki)
       ON CONFLICT(code) DO UPDATE SET name=excluded.name, color=excluded.color, color2=excluded.color2,
       flag=COALESCE(excluded.flag, marble_teams.flag), wiki_link=COALESCE(excluded.wiki_link, marble_teams.wiki_link)`
    );
    for (const m of s.marbleTeams)
      upMarble.run({ code: m.code, name: m.name, color: m.color, color2: m.color2 ?? null, flag: m.flag ?? null, wiki: m.wikiLink ?? null });
    const idOf = (code: string) => (d.prepare("SELECT id FROM marble_teams WHERE code=?").get(code) as { id: number }).id;

    if (s.isCurrent !== false) d.prepare("UPDATE seasons SET is_current=0").run();
    const seasonId = Number(
      d.prepare("INSERT INTO seasons(year,name,event_count,slots_per_team,points_table,is_current) VALUES(?,?,?,?,?,?)")
        .run(s.year, s.name, s.eventCount, s.slotsPerTeam, JSON.stringify(s.pointsTable), s.isCurrent === false ? 0 : 1).lastInsertRowid
    );
    for (const m of s.marbleTeams) if (m.competing) d.prepare("INSERT INTO season_marbles VALUES(?,?)").run(seasonId, idOf(m.code));

    const evIds: Record<number, number> = {};
    for (const e of s.events) {
      evIds[e.eventNo] = Number(
        d.prepare("INSERT INTO events(season_id,event_no,name,date,wiki_link,video_link,counts) VALUES(?,?,?,?,?,?,?)")
          .run(seasonId, e.eventNo, e.name, e.date ?? null, e.wikiLink ?? null, e.videoLink ?? null, e.counts === false ? 0 : 1).lastInsertRowid
      );
    }
    for (const [eventNo, byCode] of Object.entries(s.results)) {
      const evId = evIds[Number(eventNo)];
      if (!evId) continue;
      const entries = Object.entries(byCode).map(([code, v]) => ({
        code,
        points: typeof v === "number" ? v : v.points,
        placement: typeof v === "number" ? null : v.placement ?? null,
      }));
      // derive placements from points when missing
      const sorted = [...entries].sort((a, b) => b.points - a.points);
      for (const e of entries) {
        const placement = e.placement ?? sorted.findIndex((x) => x.points === e.points) + 1;
        d.prepare("INSERT INTO results(event_id,marble_id,placement,points) VALUES(?,?,?,?)").run(evId, idOf(e.code), placement, e.points);
      }
    }
    for (const t of s.leagueTeams) {
      const tid = Number(
        d.prepare("INSERT INTO league_teams(season_id,name,manager,flag,draft_order) VALUES(?,?,?,?,?)")
          .run(seasonId, t.teamName, t.manager, t.flag ?? null, t.draftOrder ?? null).lastInsertRowid
      );
      t.slots.forEach((slot, i) => {
        for (const p of slot) d.prepare("INSERT INTO picks(league_team_id,slot,marble_id,start_event) VALUES(?,?,?,?)").run(tid, i + 1, idOf(p.code), p.startEvent);
      });
    }
    return seasonId;
  });
  return tx();
}

function seed(d: Database.Database) {
  try {
    const flagSrc = path.join(SEED_DIR, "flags");
    if (fs.existsSync(flagSrc)) fs.cpSync(flagSrc, FLAG_DIR, { recursive: true, force: false });
    const files = fs.existsSync(SEED_DIR) ? fs.readdirSync(SEED_DIR).filter((f) => f.startsWith("season-") && f.endsWith(".json")).sort() : [];
    for (const f of files) importSeason(d, JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), "utf8")));
    d.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('seeded','1')").run();
    if (!d.prepare("SELECT 1 FROM settings WHERE key='leagueName'").get())
      d.prepare("INSERT INTO settings(key,value) VALUES('leagueName','Fantasy Marble League')").run();
  } catch (e) {
    console.error("Seeding failed", e);
  }
}
