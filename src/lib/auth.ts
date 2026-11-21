import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "fml_admin";

function secret() {
  const base = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  return crypto.createHash("sha256").update("fml:" + base).digest();
}

export function adminEnabled() {
  return !!process.env.ADMIN_PASSWORD;
}

function token() {
  return crypto.createHmac("sha256", secret()).update("admin-session-v1").digest("hex");
}

export function checkPassword(pw: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(pw).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  if (!adminEnabled()) return false;
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return false;
  const t = token();
  return c.length === t.length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(t));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startSession() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
