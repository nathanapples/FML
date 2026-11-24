"use server";
import { revalidatePath } from "next/cache";
import { db, playerName } from "@/lib/db";
import { linkUserToPlayer, requireUser } from "@/lib/auth";

export async function saveProfile(_: unknown, f: FormData): Promise<{ ok?: string; error?: string }> {
  const { user } = await requireUser();
  const d = db();
  const name = playerName(String(f.get("displayName") ?? ""));
  if (!name) return { error: "Your name can't be empty." };
  if (user.player_id) {
    const clash = d.prepare("SELECT id FROM players WHERE name = ? COLLATE NOCASE AND id <> ?").get(name, user.player_id);
    if (clash) return { error: `There's already a player called ${name}. If that's you, pick it under "Which player are you?".` };
    d.transaction(() => {
      d.prepare("UPDATE players SET name=? WHERE id=?").run(name, user.player_id);
      d.prepare("UPDATE league_teams SET manager=? WHERE player_id=?").run(name, user.player_id);
    })();
  }
  d.prepare("UPDATE users SET display_name=? WHERE id=?").run(name, user.id);
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function choosePlayer(_: unknown, f: FormData): Promise<{ ok?: string; error?: string }> {
  const { user } = await requireUser();
  const p = String(f.get("playerId") ?? "");
  if (p !== "" && p !== "new") {
    const taken = db().prepare("SELECT display_name FROM users WHERE player_id=? AND id<>?").get(Number(p), user.id) as { display_name: string } | undefined;
    if (taken) return { error: `That player is already linked to ${taken.display_name}'s account. Ask an admin if that's wrong.` };
  }
  linkUserToPlayer(user.id, p === "" ? null : p === "new" ? "new" : Number(p));
  revalidatePath("/", "layout");
  return { ok: p === "" ? "Unlinked." : "Linked." };
}
