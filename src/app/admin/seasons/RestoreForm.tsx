"use client";
import { useActionState } from "react";
import { restoreBackup } from "../actions";

export function RestoreForm() {
  const [state, action, pending] = useActionState(restoreBackup, null);
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (!window.confirm("Restore this file? A full backup replaces all current data.")) e.preventDefault();
      }}
    >
      <input type="file" name="file" accept="application/json,.json" className="field max-w-xs text-sm" aria-label="Backup file" />
      <button className="btn btn-quiet" disabled={pending}>{pending ? "Restoring…" : "Restore"}</button>
      {state && "error" in state && state.error && <p className="w-full text-sm text-redline" role="alert">{state.error}</p>}
      {state && "ok" in state && state.ok && <p className="w-full text-sm text-[#2f855a]" role="status">{state.ok}</p>}
    </form>
  );
}
