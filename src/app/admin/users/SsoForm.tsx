"use client";
import { useActionState, useState } from "react";
import { checkOidc, saveAuthSettings } from "../actions";

type Settings = { enabled: boolean; label: string; issuer: string; clientId: string; hasSecret: boolean; internalUrl: string; adminGroup: string };
type Pinned = { mode: boolean; issuer: boolean; clientId: boolean; clientSecret: boolean; internalUrl: boolean; adminGroup: boolean; label: boolean };

const Env = ({ name }: { name: string }) => <span className="ml-1 text-xs text-ink-faint">set by {name}</span>;

export function SsoForm({ settings, pinned, redirectUri, signedInVia }: { settings: Settings; pinned: Pinned; redirectUri: string; signedInVia: string | null }) {
  const [state, action, pending] = useActionState(saveAuthSettings, null);
  const [check, setCheck] = useState<{ ok?: string; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [enabled, setEnabled] = useState(settings.enabled);

  return (
    <section className="rounded-2xl bg-board p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-bold">Single sign-on</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${settings.enabled ? "bg-[#2f855a]/15 text-[#2f855a]" : "bg-ice text-ink-soft"}`}>{settings.enabled ? "On" : "Off"}</span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        In {settings.label || "Pocket ID"}, add an OIDC client for FML with this callback URL, then paste its client ID and secret here.
      </p>
      <p className="mt-2 break-all rounded-lg bg-ice px-3 py-2 font-mono text-sm text-ink">{redirectUri}</p>

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm text-ink-soft">Button name{pinned.label && <Env name="OIDC_LABEL" />}</span><input name="label" defaultValue={settings.label} disabled={pinned.label} placeholder="Pocket ID" className="field" /></label>
        <label><span className="mb-1 block text-sm text-ink-soft">Issuer URL{pinned.issuer && <Env name="OIDC_ISSUER" />}</span><input name="issuer" type="url" defaultValue={settings.issuer} disabled={pinned.issuer} placeholder="https://id.example.com" className="field" /></label>
        <label><span className="mb-1 block text-sm text-ink-soft">Client ID{pinned.clientId && <Env name="OIDC_CLIENT_ID" />}</span><input name="clientId" defaultValue={settings.clientId} disabled={pinned.clientId} className="field" autoComplete="off" /></label>
        <label><span className="mb-1 block text-sm text-ink-soft">Client secret{pinned.clientSecret && <Env name="OIDC_CLIENT_SECRET" />}</span><input name="clientSecret" type="password" disabled={pinned.clientSecret} placeholder={settings.hasSecret ? "Saved; leave blank to keep it" : "Leave blank for a public client"} className="field" autoComplete="new-password" /></label>
        <label><span className="mb-1 block text-sm text-ink-soft">Admin group (optional){pinned.adminGroup && <Env name="OIDC_ADMIN_GROUP" />}</span><input name="adminGroup" defaultValue={settings.adminGroup} disabled={pinned.adminGroup} placeholder="fml-admins" className="field" /></label>
        <label><span className="mb-1 block text-sm text-ink-soft">Internal URL (optional){pinned.internalUrl && <Env name="OIDC_INTERNAL_URL" />}</span><input name="internalUrl" type="url" defaultValue={settings.internalUrl} disabled={pinned.internalUrl} placeholder="http://pocket-id:1411" className="field" /></label>
        <p className="text-sm text-ink-faint sm:col-span-2">
          Members of the admin group become FML admins when they sign in. The internal URL is only needed if FML can&apos;t reach the issuer URL from inside Docker.
        </p>

        <label className="flex items-start gap-2.5 rounded-xl bg-ice p-3 sm:col-span-2">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={pinned.mode} className="mt-1 h-4 w-4" />
          <span>
            <span className="block font-semibold">Use single sign-on{pinned.mode && <Env name="AUTH_MODE" />}</span>
            <span className="block text-sm text-ink-soft">
              The admin password stops working and the sign-in page shows only the {settings.label || "Pocket ID"} button. If sign-in breaks, &ldquo;Can&apos;t sign in?&rdquo; there writes a one-time admin link to the container log, and <code>AUTH_MODE=password</code> turns the password back on.
            </span>
            {enabled && !settings.enabled && signedInVia === "password" && (
              <span className="mt-2 block text-sm font-medium text-ink">
                You&apos;re signed in with the admin password, so saving this signs you out of admin. Set an admin group first, or sign in once with {settings.label || "Pocket ID"} and use the container log link to make yourself an admin here.
              </span>
            )}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={checking}
            onClick={async (e) => { setChecking(true); setCheck(await checkOidc(new FormData(e.currentTarget.form!))); setChecking(false); }}
          >
            {checking ? "Checking…" : "Check connection"}
          </button>
          {state?.error && <p className="text-sm text-redline" role="alert">{state.error}</p>}
          {state?.ok && <p className="text-sm text-[#2f855a]" role="status">{state.ok}</p>}
          {check?.error && <p className="text-sm text-redline" role="alert">{check.error}</p>}
          {check?.ok && <p className="text-sm text-[#2f855a]" role="status">{check.ok}</p>}
        </div>
      </form>
    </section>
  );
}
