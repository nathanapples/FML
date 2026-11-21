import fs from "node:fs";
import path from "node:path";
import { db, FLAG_DIR, importSeason, type SeasonFile } from "./db";

const TABLES = ["settings", "seasons", "marble_teams", "season_marbles", "events", "results", "league_teams", "picks"] as const;

function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p)];
  });
}

export function exportBackup() {
  const d = db();
  const out: Record<string, unknown> = { app: "fml", version: 2, exportedAt: new Date().toISOString() };
  for (const t of TABLES) out[t] = d.prepare(`SELECT * FROM ${t}`).all();
  const used = new Set<string>(
    [...(d.prepare("SELECT flag FROM marble_teams WHERE flag IS NOT NULL").all() as { flag: string }[]), ...(d.prepare("SELECT flag FROM league_teams WHERE flag IS NOT NULL").all() as { flag: string }[])].map((r) => r.flag)
  );
  const flags: Record<string, string> = {};
  for (const rel of walk(FLAG_DIR)) if (used.has(rel.split(path.sep).join("/"))) flags[rel.split(path.sep).join("/")] = fs.readFileSync(path.join(FLAG_DIR, rel)).toString("base64");
  out.flags = flags;
  return out;
}

/** Restores a full backup (replacing everything) or appends a single season file. Returns seasons imported. */
export function importBackup(json: Record<string, unknown>): number {
  const d = db();
  if (json.app === "fml" && Array.isArray(json.seasons)) {
    d.transaction(() => {
      for (const t of [...TABLES].reverse()) d.prepare(`DELETE FROM ${t}`).run();
      for (const t of TABLES) {
        const rows = (json[t] as Record<string, unknown>[]) ?? [];
        for (const r of rows) {
          const cols = Object.keys(r);
          d.prepare(`INSERT INTO ${t}(${cols.join(",")}) VALUES(${cols.map(() => "?").join(",")})`).run(...cols.map((c) => r[c] as never));
        }
      }
      d.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('seeded','1')").run();
    })();
    for (const [rel, b64] of Object.entries((json.flags as Record<string, string>) ?? {})) {
      const target = path.resolve(FLAG_DIR, rel);
      if (!target.startsWith(path.resolve(FLAG_DIR) + path.sep)) continue;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(b64, "base64"));
    }
    return (json.seasons as unknown[]).length;
  }
  if (Array.isArray(json.marbleTeams) && Array.isArray(json.leagueTeams)) {
    if (d.prepare("SELECT 1 FROM seasons WHERE year=?").get(json.year as number)) throw new Error(`a ${json.year} season already exists, so delete it first if you want to replace it`);
    importSeason(d, json as unknown as SeasonFile);
    return 1;
  }
  throw new Error("it isn't an FML backup or season file");
}
