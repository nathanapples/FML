"use client";
import { useActionState, useState } from "react";
import { askRecoveryLink, login } from "../admin/actions";

export function PasswordForm({ back }: { back: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="back" value={back} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Admin password</span>
        <input name="password" type="password" autoFocus autoComplete="current-password" className="field" required />
      </label>
      {state?.error && <p className="text-sm text-redline" role="alert">{state.error}</p>}
      <button className="btn w-full justify-center" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

/** "Can't sign in?": writes a one-time admin link to the container log. */
export function RecoveryButton() {
  const [state, setState] = useState<"idle" | "sent" | "wait" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <div className="mt-6 border-t border-frost pt-4 text-center text-sm text-ink-faint">
      {state === "sent" ? (
        <p className="text-ink-soft">
          A one-time admin sign-in link is in the container log. Run <code className="font-semibold text-ink">docker logs fml</code> (or open the stack&apos;s log in Dockge) and open the link. It works once, for 15 minutes.
        </p>
      ) : state === "wait" ? (
        <p>A link was just made. Check the container log, or try again in a minute.</p>
      ) : state === "error" ? (
        <p className="text-redline">{msg}</p>
      ) : (
        <button
          type="button"
          className="hover:text-ink"
          onClick={async () => {
            const r = await askRecoveryLink();
            if (r.error) { setMsg(r.error); setState("error"); } else setState(r.result ?? "sent");
          }}
        >
          Can&apos;t sign in? Put a one-time admin link in the container log
        </button>
      )}
    </div>
  );
}
