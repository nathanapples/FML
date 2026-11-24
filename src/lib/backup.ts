import fs from "node:fs";
import path from "node:path";
import { db, FLAG_DIR, importSeason, linkPlayers, type SeasonFile } from "./db";

const TABLES = ["settings", "seasons", "marble_teams", "season_marbles", "events", "results", "players", "league_teams", "picks"] as const;

// sign-in settings and secrets belong to this server, not the league: never exported, kept through a restore
const PRIVATE = ["authMode", "oidcIssuer", "oidcClientId", "oidcClientSecret", "oidcInternalUrl", "oidcAdminGroup", "oidcLabel", "cookieSecret"];
const isPrivate = (key: unknown) => PRIVATE.includes(String(key));

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
  out.settings = (out.settings as { key: string }[]).filter((r) => !isPrivate(r.key));
  const used = new Set<string>(
    [...(d.prepare("SELECT flag FROM marble_teams WHERE flag IS NOT NULL").all() as { flag: string }[]), ...(d.prepare("SELECT flag FROM league_teams WHERE flag IS NOT NULL").all() as { flag: string }[])].map((r) => r.flag)
  );
  const flags: Record<string, string> = {};
  for (const rel of walk(FLAG_DIR)) if (used.has(rel.split(path.sep).join("/"))) flags[rel.split(path.sep).join("/")] = fs.readFileSync(path.join(FLAG_DIR, rel)).toString("base64");
  out.flags = flags;
  return out;
}

const FLAG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
function writeFlags(files: Record<string, string> | undefined) {
  for (const [rel, b64] of Object.entries(files ?? {})) {
    const target = path.resolve(FLAG_DIR, rel);
    if (!target.startsWith(path.resolve(FLAG_DIR) + path.sep) || !FLAG_EXT.has(path.extname(target).toLowerCase())) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(b64, "base64"));
  }
}

/** Restores a full backup (replacing everything) or appends a single season file. Returns seasons imported. */
export function importBackup(json: Record<string, unknown>): number {
  const d = db();
  if (json.app === "fml" && Array.isArray(json.seasons)) {
    // remember who plays as whom, so accounts can be relinked after the players table is replaced
    const links = d.prepare("SELECT u.id, p.name FROM users u JOIN players p ON p.id = u.player_id").all() as { id: number; name: string }[];
    d.transaction(() => {
      for (const t of [...TABLES].reverse()) d.prepare(t === "settings" ? `DELETE FROM settings WHERE key NOT IN (${PRIVATE.map(() => "?").join(",")})` : `DELETE FROM ${t}`).run(...(t === "settings" ? PRIVATE : []));
      for (const t of TABLES) {
        const rows = ((json[t] as Record<string, unknown>[]) ?? []).filter((r) => t !== "settings" || !isPrivate(r.key));
        for (const r of rows) {
          const cols = Object.keys(r);
          d.prepare(`INSERT INTO ${t}(${cols.join(",")}) VALUES(${cols.map(() => "?").join(",")})`).run(...cols.map((c) => r[c] as never));
        }
      }
      d.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('seeded','1')").run();
    })();
    writeFlags(json.flags as Record<string, string> | undefined);
    linkPlayers(d);
    const byName = d.prepare("SELECT id FROM players WHERE lower(name) = lower(?)");
    const relink = d.prepare("UPDATE users SET player_id = ? WHERE id = ? AND NOT EXISTS (SELECT 1 FROM users WHERE player_id = ?)");
    for (const l of links) {
      const p = byName.get(l.name) as { id: number } | undefined;
      if (p) relink.run(p.id, l.id, p.id);
    }
    return (json.seasons as unknown[]).length;
  }
  if (Array.isArray(json.marbleTeams) && Array.isArray(json.leagueTeams)) {
    if (d.prepare("SELECT 1 FROM seasons WHERE year=?").get(json.year as number)) throw new Error(`a ${json.year} season already exists, so delete it first if you want to replace it`);
    // season files may carry their own flag images: { "league/2023/team.webp": "<base64>" }
    writeFlags(json.flagFiles as Record<string, string> | undefined);
    importSeason(d, json as unknown as SeasonFile);
    return 1;
  }
  throw new Error("it isn't an FML backup or season file");
}
