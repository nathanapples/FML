"use server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, FLAG_DIR, DEFAULT_POINTS, setSetting } from "@/lib/db";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { importBackup } from "@/lib/backup";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const int = (f: FormData, k: string, d = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : d;
};
const optInt = (f: FormData, k: string) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : null;
};
function done() {
  revalidatePath("/", "layout");
}

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
async function saveFlag(f: FormData, key = "flag"): Promise<string | null> {
  const file = f.get(key);
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = path.extname(file.name).toLowerCase();
  if (!IMG_EXT.has(ext)) throw new Error("Flags must be PNG, JPG, WebP, GIF or AVIF images.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Flags must be under 10 MB.");
  const rel = `uploads/${crypto.randomBytes(6).toString("hex")}${ext}`;
  fs.mkdirSync(path.join(FLAG_DIR, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(FLAG_DIR, rel), Buffer.from(await file.arrayBuffer()));
  return rel;
}

/* ---------- session ---------- */

export async function login(_: unknown, f: FormData) {
  if (!checkPassword(str(f, "password"))) return { error: "That password isn't right." };
  await startSession();
  redirect("/admin");
}
export async function logout() {
  await endSession();
  redirect("/");
}

/* ---------- results ---------- */

export async function saveResults(f: FormData) {
  await requireAdmin();
  const eventId = int(f, "eventId");
  const rows = JSON.parse(str(f, "rows") || "[]") as { marbleId: number; placement: number | null; points: number }[];
  const d = db();
  d.transaction(() => {
    d.prepare("DELETE FROM results WHERE event_id=?").run(eventId);
    const ins = d.prepare("INSERT INTO results(event_id,marble_id,placement,points) VALUES(?,?,?,?)");
    for (const r of rows) ins.run(eventId, r.marbleId, r.placement, Math.round(Number(r.points) || 0));
  })();
  done();
}
export async function clearResults(f: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM results WHERE event_id=?").run(int(f, "eventId"));
  done();
}

/* ---------- events ---------- */

export async function saveEvent(f: FormData) {
  await requireAdmin();
  db().prepare("UPDATE events SET name=?, date=?, wiki_link=?, video_link=?, counts=? WHERE id=?").run(
    str(f, "name") || "Untitled event", optStr(f, "date"), optStr(f, "wikiLink"), optStr(f, "videoLink"), f.get("counts") === "on" ? 1 : 0, int(f, "id")
  );
  done();
}
export async function addEvent(f: FormData) {
  await requireAdmin();
  const d = db();
  const sid = int(f, "seasonId");
  const next = ((d.prepare("SELECT MAX(event_no) m FROM events WHERE season_id=?").get(sid) as { m: number | null }).m ?? 0) + 1;
  d.prepare("INSERT INTO events(season_id,event_no,name) VALUES(?,?,?)").run(sid, next, `Event ${next}`);
  d.prepare("UPDATE seasons SET event_count=(SELECT COUNT(*) FROM events WHERE season_id=?) WHERE id=?").run(sid, sid);
  done();
}
export async function deleteEvent(f: FormData) {
  await requireAdmin();
  const d = db();
  const ev = d.prepare("SELECT season_id FROM events WHERE id=?").get(int(f, "id")) as { season_id: number } | undefined;
  if (!ev) return;
  d.prepare("DELETE FROM events WHERE id=?").run(int(f, "id"));
  // renumber so event numbers stay contiguous
  const rows = d.prepare("SELECT id FROM events WHERE season_id=? ORDER BY event_no").all(ev.season_id) as { id: number }[];
  d.transaction(() => {
    rows.forEach((r, i) => d.prepare("UPDATE events SET event_no=? WHERE id=?").run(-(i + 1), r.id));
    d.prepare("UPDATE events SET event_no=-event_no WHERE season_id=?").run(ev.season_id);
    d.prepare("UPDATE seasons SET event_count=? WHERE id=?").run(rows.length, ev.season_id);
  })();
  done();
}

/* ---------- league teams & picks ---------- */

export async function saveTeam(f: FormData) {
  await requireAdmin();
  const d = db();
  const flag = await saveFlag(f);
  const id = optInt(f, "id");
  if (id) {
    d.prepare("UPDATE league_teams SET name=?, manager=?, draft_order=?, flag=COALESCE(?, flag) WHERE id=?").run(
      str(f, "name") || "Unnamed team", str(f, "manager"), optInt(f, "draftOrder"), flag, id
    );
    if (f.get("removeFlag") === "on") d.prepare("UPDATE league_teams SET flag=NULL WHERE id=?").run(id);
  } else {
    const sid = int(f, "seasonId");
    const newId = Number(
      d.prepare("INSERT INTO league_teams(season_id,name,manager,draft_order,flag) VALUES(?,?,?,?,?)")
        .run(sid, str(f, "name") || "Unnamed team", str(f, "manager"), optInt(f, "draftOrder"), flag).lastInsertRowid
    );
    const slots = (d.prepare("SELECT slots_per_team s FROM seasons WHERE id=?").get(sid) as { s: number }).s;
    for (let s = 1; s <= slots; s++) {
      const m = optInt(f, `slot${s}`);
      if (m) d.prepare("INSERT INTO picks(league_team_id,slot,marble_id,start_event) VALUES(?,?,?,1)").run(newId, s, m);
    }
  }
  done();
}
export async function deleteTeam(f: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM league_teams WHERE id=?").run(int(f, "id"));
  done();
}
/** Sets which marble holds a slot from a given event onward. Event 1 replaces the draft pick; later events record a trade. */
export async function setPick(f: FormData) {
  await requireAdmin();
  const startEvent = Math.max(1, int(f, "startEvent", 1));
  db().prepare(
    `INSERT INTO picks(league_team_id,slot,marble_id,start_event) VALUES(?,?,?,?)
     ON CONFLICT(league_team_id,slot,start_event) DO UPDATE SET marble_id=excluded.marble_id`
  ).run(int(f, "teamId"), int(f, "slot"), int(f, "marbleId"), startEvent);
  done();
}
export async function deletePick(f: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM picks WHERE id=?").run(int(f, "id"));
  done();
}

/* ---------- marbles ---------- */

export async function saveMarble(f: FormData) {
  await requireAdmin();
  const d = db();
  const flag = await saveFlag(f);
  const id = optInt(f, "id");
  const code = str(f, "code").toUpperCase().slice(0, 4);
  if (!code) throw new Error("A marble team needs a short code, like BB.");
  const vals = [code, str(f, "name") || code, str(f, "color") || "#8899aa", f.get("useColor2") === "on" ? str(f, "color2") || null : null, optStr(f, "wikiLink")];
  if (id) {
    d.prepare("UPDATE marble_teams SET code=?, name=?, color=?, color2=?, wiki_link=?, flag=COALESCE(?, flag) WHERE id=?").run(...vals, flag, id);
    if (f.get("removeFlag") === "on") d.prepare("UPDATE marble_teams SET flag=NULL WHERE id=?").run(id);
  } else {
    const newId = Number(d.prepare("INSERT INTO marble_teams(code,name,color,color2,wiki_link,flag) VALUES(?,?,?,?,?,?)").run(...vals, flag).lastInsertRowid);
    const sid = optInt(f, "seasonId");
    if (sid) d.prepare("INSERT OR IGNORE INTO season_marbles VALUES(?,?)").run(sid, newId);
  }
  done();
}
export async function setCompeting(f: FormData) {
  await requireAdmin();
  const d = db();
  if (f.get("on") === "1") d.prepare("INSERT OR IGNORE INTO season_marbles VALUES(?,?)").run(int(f, "seasonId"), int(f, "marbleId"));
  else d.prepare("DELETE FROM season_marbles WHERE season_id=? AND marble_id=?").run(int(f, "seasonId"), int(f, "marbleId"));
  done();
}
export async function deleteMarble(f: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM marble_teams WHERE id=?").run(int(f, "id"));
  done();
}

/* ---------- seasons & settings ---------- */

function parsePoints(s: string) {
  const arr = s.split(/[\s,]+/).filter(Boolean).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
  return arr.length ? arr : DEFAULT_POINTS;
}

export async function createSeason(f: FormData) {
  await requireAdmin();
  const d = db();
  const year = int(f, "year", new Date().getFullYear());
  const eventCount = Math.max(1, Math.min(60, int(f, "eventCount", 16)));
  const copyFrom = optInt(f, "copyFrom");
  d.transaction(() => {
    d.prepare("UPDATE seasons SET is_current=0").run();
    const sid = Number(
      d.prepare("INSERT INTO seasons(year,name,event_count,slots_per_team,points_table,is_current) VALUES(?,?,?,?,?,1)")
        .run(year, str(f, "name") || `Marble League ${year}`, eventCount, Math.max(1, Math.min(6, int(f, "slots", 2))), JSON.stringify(parsePoints(str(f, "points")))).lastInsertRowid
    );
    for (let i = 1; i <= eventCount; i++) d.prepare("INSERT INTO events(season_id,event_no,name) VALUES(?,?,?)").run(sid, i, `Event ${i}`);
    if (copyFrom) {
      d.prepare("INSERT INTO season_marbles SELECT ?, marble_id FROM season_marbles WHERE season_id=?").run(sid, copyFrom);
      if (f.get("copyTeams") === "on")
        d.prepare("INSERT INTO league_teams(season_id,name,manager,flag) SELECT ?, name, manager, flag FROM league_teams WHERE season_id=? ORDER BY COALESCE(draft_order,999)").run(sid, copyFrom);
    }
  })();
  done();
  redirect(`/admin/seasons`);
}
export async function updateSeason(f: FormData) {
  await requireAdmin();
  db().prepare("UPDATE seasons SET year=?, name=?, slots_per_team=?, points_table=? WHERE id=?").run(
    int(f, "year"), str(f, "name"), Math.max(1, Math.min(6, int(f, "slots", 2))), JSON.stringify(parsePoints(str(f, "points"))), int(f, "id")
  );
  done();
}
export async function makeCurrent(f: FormData) {
  await requireAdmin();
  const d = db();
  d.transaction(() => {
    d.prepare("UPDATE seasons SET is_current=0").run();
    d.prepare("UPDATE seasons SET is_current=1 WHERE id=?").run(int(f, "id"));
  })();
  done();
}
export async function deleteSeason(f: FormData) {
  await requireAdmin();
  if (str(f, "confirm") !== "delete") return;
  db().prepare("DELETE FROM seasons WHERE id=?").run(int(f, "id"));
  done();
  redirect("/admin/seasons");
}
export async function saveSettings(f: FormData) {
  await requireAdmin();
  setSetting("leagueName", str(f, "leagueName") || "Fantasy Marble League");
  done();
}

export async function restoreBackup(_: unknown, f: FormData) {
  await requireAdmin();
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a backup file first." };
  try {
    const n = importBackup(JSON.parse(await file.text()));
    done();
    return { ok: `Restored ${n} season${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: `That file couldn't be restored: ${(e as Error).message}` };
  }
}
