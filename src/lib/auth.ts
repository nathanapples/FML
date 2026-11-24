/**
 * Who is using FML.
 *
 * - password (default): no user accounts. ADMIN_PASSWORD signs you in to admin.
 * - oidc: people sign in with an OpenID Connect provider such as Pocket ID and get
 *   their own account. The admin password form goes away; if sign-in ever breaks,
 *   "Can't sign in?" writes a one-time admin link to the container log, and
 *   AUTH_MODE=password brings the password back.
 *
 * Public pages never need a sign-in.
 */
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db, getSetting, setSetting, findOrCreatePlayer } from "./db";

export type AuthMode = "password" | "oidc";
export type Via = "password" | "oidc" | "recovery";
export type UserRow = {
  id: number;
  oidc_sub: string | null;
  email: string | null;
  display_name: string;
  role: "admin" | "member";
  player_id: number | null;
  created_at: string;
  last_login_at: string | null;
};
export type Viewer = { user: UserRow | null; admin: boolean; via: Via };

const SESSION_COOKIE = "fml_session";
export const FLOW_COOKIE = "fml_oidc";
const SESSION_DAYS = 60;

/* ---------- settings (environment variables win over what's saved in admin) ---------- */

export function authSettings() {
  const env = process.env;
  const mode = (env.AUTH_MODE || getSetting("authMode", "password")) === "oidc" ? "oidc" : "password";
  return {
    mode: mode as AuthMode,
    issuer: (env.OIDC_ISSUER || getSetting("oidcIssuer")).replace(/\/+$/, ""),
    clientId: env.OIDC_CLIENT_ID || getSetting("oidcClientId"),
    clientSecret: env.OIDC_CLIENT_SECRET || getSetting("oidcClientSecret"),
    internalUrl: (env.OIDC_INTERNAL_URL || getSetting("oidcInternalUrl")).replace(/\/+$/, ""),
    adminGroup: env.OIDC_ADMIN_GROUP || getSetting("oidcAdminGroup"),
    label: env.OIDC_LABEL || getSetting("oidcLabel") || "Pocket ID",
    pinned: {
      mode: !!env.AUTH_MODE,
      issuer: !!env.OIDC_ISSUER,
      clientId: !!env.OIDC_CLIENT_ID,
      clientSecret: !!env.OIDC_CLIENT_SECRET,
      internalUrl: !!env.OIDC_INTERNAL_URL,
      adminGroup: !!env.OIDC_ADMIN_GROUP,
      label: !!env.OIDC_LABEL,
    },
  };
}

export const adminPassword = () => process.env.ADMIN_PASSWORD || "";
export const passwordLoginAllowed = () => authSettings().mode === "password" && !!adminPassword();
export const recoveryAllowed = () => authSettings().mode === "oidc" && process.env.LOG_RECOVERY_LINK !== "false";
/** Is there any way into admin at all? */
export const adminEnabled = () => authSettings().mode === "oidc" || !!adminPassword();

/** A random secret saved on first use, for signing the short-lived sign-in cookie. */
function cookieSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  let s = getSetting("cookieSecret");
  if (!s) {
    s = crypto.randomBytes(32).toString("hex");
    setSetting("cookieSecret", s);
  }
  return s;
}
export function sign(value: string) {
  const mac = crypto.createHmac("sha256", cookieSecret()).update(value).digest("base64url");
  return `${Buffer.from(value).toString("base64url")}.${mac}`;
}
export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const [b64, mac] = signed.split(".");
  if (!b64 || !mac) return null;
  const value = Buffer.from(b64, "base64url").toString();
  const want = crypto.createHmac("sha256", cookieSecret()).update(value).digest("base64url");
  return mac.length === want.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want)) ? value : null;
}

/* ---------- where the browser reached us ---------- */

export async function publicBase() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, "");
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() || "http";
  const host = (h.get("x-forwarded-host") || "").split(",")[0].trim() || h.get("host") || "localhost:5076";
  return `${proto}://${host}`;
}
async function isHttps() {
  if (process.env.COOKIE_SECURE === "true") return true;
  return (await publicBase()).startsWith("https://");
}

/* ---------- sessions ---------- */

export async function createSession(userId: number | null, via: Via) {
  const d = db();
  const id = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  d.prepare("INSERT INTO sessions(id, user_id, via, expires_at) VALUES(?,?,?,?)").run(id, userId, via, expires.toISOString());
  d.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  if (userId) d.prepare("UPDATE users SET last_login_at=datetime('now') WHERE id=?").run(userId);
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: await isHttps(), path: "/", expires });
}

export async function endSession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) db().prepare("DELETE FROM sessions WHERE id=?").run(id);
  jar.delete(SESSION_COOKIE);
}

/** Who is signed in on this request, or null. */
export const viewer = cache(async (): Promise<Viewer | null> => {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const d = db();
  const row = d.prepare("SELECT user_id, via, expires_at FROM sessions WHERE id=?").get(id) as { user_id: number | null; via: Via; expires_at: string } | undefined;
  if (!row || row.expires_at < new Date().toISOString()) return null;
  const mode = authSettings().mode;
  if (row.via === "password") return mode === "password" && adminPassword() ? { user: null, admin: true, via: "password" } : null;
  if (row.via === "recovery") return { user: null, admin: true, via: "recovery" };
  if (mode !== "oidc" || !row.user_id) return null;
  const user = d.prepare("SELECT * FROM users WHERE id=?").get(row.user_id) as UserRow | undefined;
  return user ? { user, admin: user.role === "admin", via: "oidc" } : null;
});

export async function isAdmin() {
  return (await viewer())?.admin ?? false;
}
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/signin?back=/admin");
}
export async function requireUser() {
  const v = await viewer();
  // signed in with the admin password or a log link: there's no account to show
  if (v && !v.user) redirect("/admin");
  if (!v?.user) redirect("/signin?back=/account");
  return v as Viewer & { user: UserRow };
}

export function checkPassword(pw: string) {
  const expected = adminPassword();
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(pw).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------- OpenID Connect (Pocket ID and friends) ---------- */

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  token_endpoint_auth_methods_supported?: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var __fmlOidc: { key: string; at: number; d: Discovery; jwks: ReturnType<typeof createRemoteJWKSet> } | undefined;
  // eslint-disable-next-line no-var
  var __fmlRecovery: { code: string; expires: number; last: number } | undefined;
}

/** Reads the provider's configuration. With an internal URL, FML talks to the provider there; browsers still use the public one. */
export async function oidcDiscovery(fresh = false, override?: { issuer: string; clientId: string; internalUrl: string }) {
  const s = { ...authSettings(), ...(override ?? {}) };
  if (!s.issuer || !s.clientId) throw new Error(`${s.label} isn't set up yet: add the issuer URL and client ID in Admin, Users and sign-in.`);
  const key = `${s.issuer}|${s.internalUrl}`;
  const hit = globalThis.__fmlOidc;
  if (!fresh && hit?.key === key && Date.now() - hit.at < 3600_000) return hit;
  const base = s.internalUrl || s.issuer;
  const res = await fetch(`${base}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15_000), cache: "no-store" }).catch((err: Error & { cause?: { code?: string } }) => {
    throw new Error(`Couldn't reach ${base}: ${err.cause?.code ?? err.message}`);
  });
  if (!res.ok) throw new Error(`${base} answered ${res.status} when asked for its OpenID configuration.`);
  const d = (await res.json()) as Discovery;
  if (s.internalUrl) {
    const pub = new URL(s.issuer).origin;
    const internal = new URL(s.internalUrl).origin;
    const inside = (u?: string) => (u ? u.replace(pub, internal) : u);
    d.token_endpoint = inside(d.token_endpoint)!;
    d.jwks_uri = inside(d.jwks_uri)!;
    d.userinfo_endpoint = inside(d.userinfo_endpoint);
    d.authorization_endpoint = d.authorization_endpoint.replace(internal, pub);
  }
  if (d.issuer.replace(/\/$/, "") !== s.issuer.replace(/\/$/, "")) throw new Error(`${base} says its issuer is ${d.issuer}, not ${s.issuer}. Use that as the issuer URL.`);
  const out = { key, at: Date.now(), d, jwks: createRemoteJWKSet(new URL(d.jwks_uri)) };
  if (!override) globalThis.__fmlOidc = out;
  return out;
}

export async function oidcRedirectUri() {
  return `${await publicBase()}/auth/oidc/callback`;
}

export class SignInError extends Error {}

/** Swaps the provider's code for the person's identity and returns their FML user. */
export async function oidcFinish(params: URLSearchParams, flow: { state: string; nonce: string; verifier: string }) {
  const s = authSettings();
  if (params.get("error")) throw new SignInError(params.get("error_description") || params.get("error")!);
  if (!params.get("state") || params.get("state") !== flow.state) throw new SignInError("The sign-in didn't match. Try again.");
  const code = params.get("code");
  if (!code) throw new SignInError(`No code came back from ${s.label}.`);
  const { d, jwks } = await oidcDiscovery();
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: await oidcRedirectUri(), code_verifier: flow.verifier, client_id: s.clientId });
  const hdrs: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  const methods = d.token_endpoint_auth_methods_supported ?? ["client_secret_basic"];
  if (s.clientSecret) {
    if (methods.includes("client_secret_basic") || !methods.includes("client_secret_post")) {
      hdrs.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(s.clientId)}:${encodeURIComponent(s.clientSecret)}`).toString("base64")}`;
    } else body.set("client_secret", s.clientSecret);
  }
  const res = await fetch(d.token_endpoint, { method: "POST", headers: hdrs, body, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const tokens = (await res.json().catch(() => ({}))) as { id_token?: string; access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !tokens.id_token) throw new SignInError(tokens.error_description || tokens.error || `${s.label} answered ${res.status}.`);
  const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: d.issuer || s.issuer, audience: s.clientId });
  if (payload.nonce !== flow.nonce) throw new SignInError("The sign-in didn't match. Try again.");
  let claims = payload as Record<string, unknown>;
  if ((!claims.email || !claims.name) && d.userinfo_endpoint && tokens.access_token) {
    const info = await fetch(d.userinfo_endpoint, { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    claims = { ...info, ...claims };
  }
  return userForClaims({
    sub: String(claims.sub),
    email: (claims.email as string) || null,
    name: (claims.name as string) || (claims.preferred_username as string) || null,
    groups: Array.isArray(claims.groups) ? (claims.groups as string[]) : [],
  });
}

/** The FML user for someone the provider signed in, created on their first visit. */
function userForClaims(c: { sub: string; email: string | null; name: string | null; groups: string[] }): UserRow {
  const d = db();
  const s = authSettings();
  let user = d.prepare("SELECT * FROM users WHERE oidc_sub=?").get(c.sub) as UserRow | undefined;
  if (!user) {
    const name = c.name || c.email?.split("@")[0] || "New player";
    const id = Number(d.prepare("INSERT INTO users(oidc_sub, email, display_name) VALUES(?,?,?)").run(c.sub, c.email, name).lastInsertRowid);
    // Link to their player straight away when the name matches one nobody has claimed.
    const p = d.prepare("SELECT id FROM players WHERE name = ? COLLATE NOCASE AND id NOT IN (SELECT player_id FROM users WHERE player_id IS NOT NULL)").get(name) as { id: number } | undefined;
    if (p) d.prepare("UPDATE users SET player_id=? WHERE id=?").run(p.id, id);
    user = d.prepare("SELECT * FROM users WHERE id=?").get(id) as UserRow;
  } else if (c.email && c.email !== user.email) {
    d.prepare("UPDATE users SET email=? WHERE id=?").run(c.email, user.id);
  }
  if (s.adminGroup && c.groups.includes(s.adminGroup) && user.role !== "admin") d.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  return d.prepare("SELECT * FROM users WHERE id=?").get(user.id) as UserRow;
}

/** Links a user to a player, creating the player from their name if asked. One user per player. */
export function linkUserToPlayer(userId: number, playerId: number | "new" | null) {
  const d = db();
  if (playerId === null) {
    d.prepare("UPDATE users SET player_id=NULL WHERE id=?").run(userId);
    return;
  }
  const user = d.prepare("SELECT display_name FROM users WHERE id=?").get(userId) as { display_name: string } | undefined;
  if (!user) return;
  const pid = playerId === "new" ? findOrCreatePlayer(d, user.display_name) : playerId;
  if (!pid) return;
  d.transaction(() => {
    d.prepare("UPDATE users SET player_id=NULL WHERE player_id=? AND id<>?").run(pid, userId);
    d.prepare("UPDATE users SET player_id=? WHERE id=?").run(pid, userId);
  })();
}

/* ---------- one-time admin link in the container log ---------- */

/** Writes a one-time admin sign-in link to the container log: one at a time, 15 minutes, single use, at most one a minute. */
export async function requestRecoveryLink(): Promise<"sent" | "wait"> {
  const prev = globalThis.__fmlRecovery;
  if (prev && Date.now() - prev.last < 60_000) return "wait";
  const code = crypto.randomBytes(24).toString("base64url");
  globalThis.__fmlRecovery = { code, expires: Date.now() + 15 * 60_000, last: Date.now() };
  const url = `${await publicBase()}/auth/recovery/${code}`;
  const line = "=".repeat(72);
  console.log(`\n${line}\nFML: one-time admin sign-in link (works once, for 15 minutes):\n\n  ${url}\n\nIf you didn't ask for this, someone pressed "Can't sign in?" on the sign-in page.\n${line}\n`);
  return "sent";
}

export function useRecoveryLink(code: string) {
  const r = globalThis.__fmlRecovery;
  if (!r || r.expires < Date.now()) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(r.code);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  globalThis.__fmlRecovery = { ...r, code: crypto.randomBytes(24).toString("base64url"), expires: 0 };
  return true;
}
