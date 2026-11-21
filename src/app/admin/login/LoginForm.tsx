"use client";
import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-board p-5">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-soft">Password</span>
        <input name="password" type="password" autoFocus autoComplete="current-password" className="field" required />
      </label>
      {state?.error && <p className="text-sm text-redline" role="alert">{state.error}</p>}
      <button className="btn w-full justify-center" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
