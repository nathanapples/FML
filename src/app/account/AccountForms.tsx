"use client";
import { useActionState } from "react";
import { choosePlayer, saveProfile } from "./actions";

function Status({ state }: { state: { ok?: string; error?: string } | null }) {
  if (!state) return null;
  return state.error ? <p className="text-sm text-redline" role="alert">{state.error}</p> : <p className="text-sm text-[#2f855a]" role="status">{state.ok}</p>;
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
      <input name="displayName" defaultValue={name} className="field min-w-0 flex-1 basis-56" aria-label="Your name" maxLength={60} required />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <div className="w-full"><Status state={state} /></div>
    </form>
  );
}

export function PlayerForm({ current, choices, name }: { current: number | null; choices: { id: number; name: string; seasons: number }[]; name: string }) {
  const [state, action, pending] = useActionState(choosePlayer, null);
  const nameTaken = choices.some((c) => c.name.toLowerCase() === name.toLowerCase());
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
      <select name="playerId" defaultValue={current ?? ""} className="field min-w-0 flex-1 basis-56" aria-label="Which player are you?">
        <option value="">Not linked to a player</option>
        {choices.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.seasons ? ` (${c.seasons} ${c.seasons === 1 ? "season" : "seasons"})` : ""}</option>
        ))}
        {!nameTaken && <option value="new">I&apos;m new: add me as {name}</option>}
      </select>
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <div className="w-full"><Status state={state} /></div>
    </form>
  );
}
