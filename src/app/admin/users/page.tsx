import { adminData } from "@/lib/admin";
import { db } from "@/lib/db";
import { authSettings, oidcRedirectUri, viewer, type UserRow } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { setUserRole, setUserPlayer, deleteUser } from "../actions";
import { SsoForm } from "./SsoForm";

export const dynamic = "force-dynamic";

const when = (iso: string | null) => {
  if (!iso) return "never";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { season, seasons } = await adminData(searchParams);
  const d = db();
  const s = authSettings();
  const v = await viewer();
  const users = d.prepare("SELECT * FROM users ORDER BY role='admin' DESC, display_name").all() as UserRow[];
  const players = d.prepare("SELECT id, name FROM players ORDER BY name").all() as { id: number; name: string }[];
  const playerName = new Map(players.map((p) => [p.id, p.name]));
  const linked = new Map(users.filter((u) => u.player_id).map((u) => [u.player_id!, u.id]));

  return (
    <AdminShell active="/admin/users" season={season} seasons={seasons}>
      <h1 className="font-display text-4xl font-bold">Users and sign-in</h1>
      <p className="mb-6 mt-1 max-w-2xl text-ink-soft">
        With single sign-on on, people sign in with {s.label} and get their own account, which they link to their player under My account. The public pages never need a sign-in.
      </p>

      <SsoForm
        settings={{ enabled: s.mode === "oidc", label: s.label, issuer: s.issuer, clientId: s.clientId, hasSecret: !!s.clientSecret, internalUrl: s.internalUrl, adminGroup: s.adminGroup }}
        pinned={s.pinned}
        redirectUri={await oidcRedirectUri()}
        signedInVia={v?.via ?? null}
      />

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold">Users</h2>
        {users.length === 0 ? (
          <p className="mt-2 text-ink-soft">Nobody has signed in yet. People appear here the first time they sign in with {s.label}.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {users.map((u) => (
              <li key={u.id} className="rounded-2xl bg-board p-4">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{u.display_name}</span>
                  {u.email && <span className="text-sm text-ink-soft">{u.email}</span>}
                  {u.role === "admin" && <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Admin</span>}
                  <span className="ml-auto text-sm text-ink-faint">Last signed in {when(u.last_login_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={setUserPlayer} className="flex min-w-0 flex-1 basis-72 gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="playerId" defaultValue={u.player_id ?? ""} className="field min-w-0" aria-label={`Player for ${u.display_name}`}>
                      <option value="">Not linked to a player</option>
                      {players.filter((p) => !linked.has(p.id) || linked.get(p.id) === u.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      <option value="new">New player named {u.display_name}</option>
                    </select>
                    <Submit className="btn btn-quiet" pendingText="…">Link</Submit>
                  </form>
                  <form action={setUserRole}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="role" value={u.role === "admin" ? "member" : "admin"} />
                    {v?.user?.id === u.id && u.role === "admin" ? (
                      <span className="text-sm text-ink-faint">That&apos;s you</span>
                    ) : (
                      <Submit className="btn btn-quiet" pendingText="…" confirm={u.role === "admin" ? `Remove admin access from ${u.display_name}?` : `Make ${u.display_name} an admin?`}>
                        {u.role === "admin" ? "Remove admin" : "Make admin"}
                      </Submit>
                    )}
                  </form>
                  {v?.user?.id !== u.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <Submit className="text-sm text-ink-faint hover:text-redline" pendingText="…" confirm={`Remove ${u.display_name}'s account? Their player and teams stay; they can sign in again to make a new account.`}>Remove</Submit>
                    </form>
                  )}
                </div>
                {u.player_id && <p className="mt-2 text-sm text-ink-soft">Plays as {playerName.get(u.player_id)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
