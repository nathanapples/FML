"use server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, FLAG_DIR, DEFAULT_POINTS, setSetting, findOrCreatePlayer, playerName } from "@/lib/db";
import { authSettings, checkPassword, createSession, endSession, linkUserToPlayer, oidcDiscovery, passwordLoginAllowed, recoveryAllowed, requestRecoveryLink, requireAdmin, viewer } from "@/lib/auth";
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
  if (!passwordLoginAllowed()) return { error: "Password sign-in is off while single sign-on is on." };
  if (!checkPassword(str(f, "password"))) return { error: "That password isn't right." };
  await createSession(null, "password");
  const back = str(f, "back");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/admin");
}
export async function logout() {
  await endSession();
  redirect("/");
}
export async function askRecoveryLink(): Promise<{ result?: "sent" | "wait"; error?: string }> {
  if (!recoveryAllowed()) return { error: "One-time links in the container log are turned off." };
  return { result: await requestRecoveryLink() };
}

/* ---------- users and sign-in (admin) ---------- */

export async function saveAuthSettings(_: unknown, f: FormData): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const s = authSettings();
  const set = (key: string, value: string, pinned: boolean) => { if (!pinned) setSetting(key, value); };
  set("oidcIssuer", str(f, "issuer").replace(/\/+$/, ""), s.pinned.issuer);
  set("oidcClientId", str(f, "clientId"), s.pinned.clientId);
  if (str(f, "clientSecret")) set("oidcClientSecret", str(f, "clientSecret"), s.pinned.clientSecret);
  set("oidcInternalUrl", str(f, "internalUrl").replace(/\/+$/, ""), s.pinned.internalUrl);
  set("oidcAdminGroup", str(f, "adminGroup"), s.pinned.adminGroup);
  set("oidcLabel", str(f, "label"), s.pinned.label);
  const wantOidc = f.get("enabled") === "on";
  if (!s.pinned.mode) {
    if (wantOidc) {
      try {
        await oidcDiscovery(true);
      } catch (e) {
        setSetting("authMode", "password");
        done();
        return { error: `Saved, but single sign-on stays off: ${(e as Error).message}` };
      }
    }
    setSetting("authMode", wantOidc ? "oidc" : "password");
  }
  done();
  return { ok: wantOidc ? "Saved. Single sign-on is on." : "Saved." };
}
export async function checkOidc(f?: FormData): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const s = authSettings();
  const pick = (k: "issuer" | "clientId" | "internalUrl") => (s.pinned[k] || !f ? s[k] : str(f, k) || "").replace(/\/+$/, "");
  try {
    const { d } = await oidcDiscovery(true, { issuer: pick("issuer"), clientId: pick("clientId"), internalUrl: pick("internalUrl") });
    return { ok: `Connected to ${d.issuer}.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
export async function setUserRole(f: FormData) {
  await requireAdmin();
  const v = await viewer();
  const id = int(f, "id");
  const role = str(f, "role") === "admin" ? "admin" : "member";
  // don't let an admin remove their own admin rights by accident
  if (v?.user?.id === id && role !== "admin") return;
  db().prepare("UPDATE users SET role=? WHERE id=?").run(role, id);
  done();
}
export async function setUserPlayer(f: FormData) {
  await requireAdmin();
  const p = str(f, "playerId");
  linkUserToPlayer(int(f, "id"), p === "" ? null : p === "new" ? "new" : Number(p));
  done();
}
export async function deleteUser(f: FormData) {
  await requireAdmin();
  const v = await viewer();
  const id = int(f, "id");
  if (v?.user?.id === id) return;
  db().prepare("DELETE FROM users WHERE id=?").run(id);
  done();
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
    d.prepare("UPDATE league_teams SET name=?, manager=?, player_id=?, draft_order=?, flag=COALESCE(?, flag) WHERE id=?").run(
      str(f, "name") || "Unnamed team", playerName(str(f, "manager")), findOrCreatePlayer(d, str(f, "manager")), optInt(f, "draftOrder"), flag, id
    );
    if (f.get("removeFlag") === "on") d.prepare("UPDATE league_teams SET flag=NULL WHERE id=?").run(id);
  } else {
    const sid = int(f, "seasonId");
    const newId = Number(
      d.prepare("INSERT INTO league_teams(season_id,name,manager,player_id,draft_order,flag) VALUES(?,?,?,?,?,?)")
        .run(sid, str(f, "name") || "Unnamed team", playerName(str(f, "manager")), findOrCreatePlayer(d, str(f, "manager")), optInt(f, "draftOrder"), flag).lastInsertRowid
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

/* ---------- players ---------- */

export async function renamePlayer(f: FormData) {
  await requireAdmin();
  const d = db();
  const id = int(f, "id");
  const name = playerName(str(f, "name"));
  if (!name) return;
  const clash = d.prepare("SELECT id FROM players WHERE name = ? COLLATE NOCASE AND id <> ?").get(name, id) as { id: number } | undefined;
  d.transaction(() => {
    if (clash) {
      // renaming onto an existing player merges the two
      d.prepare("UPDATE league_teams SET player_id=?, manager=? WHERE player_id=?").run(clash.id, name, id);
      d.prepare("DELETE FROM players WHERE id=?").run(id);
    } else {
      d.prepare("UPDATE players SET name=? WHERE id=?").run(name, id);
      d.prepare("UPDATE league_teams SET manager=? WHERE player_id=?").run(name, id);
    }
  })();
  done();
}
export async function mergePlayer(f: FormData) {
  await requireAdmin();
  const d = db();
  const from = int(f, "id"), into = int(f, "into");
  if (!into || from === into) return;
  const name = (d.prepare("SELECT name FROM players WHERE id=?").get(into) as { name: string } | undefined)?.name;
  if (!name) return;
  d.transaction(() => {
    d.prepare("UPDATE league_teams SET player_id=?, manager=? WHERE player_id=?").run(into, name, from);
    d.prepare("DELETE FROM players WHERE id=?").run(from);
  })();
  done();
}
export async function addPlayer(f: FormData) {
  await requireAdmin();
  findOrCreatePlayer(db(), str(f, "name"));
  done();
}
export async function deletePlayer(f: FormData) {
  await requireAdmin();
  const d = db();
  const id = int(f, "id");
  const used = (d.prepare("SELECT COUNT(*) c FROM league_teams WHERE player_id=?").get(id) as { c: number }).c;
  if (used === 0) d.prepare("DELETE FROM players WHERE id=?").run(id);
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
