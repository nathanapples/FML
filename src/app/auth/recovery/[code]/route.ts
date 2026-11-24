import { NextResponse } from "next/server";
import { createSession, publicBase, recoveryAllowed, useRecoveryLink } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const base = await publicBase();
  const { code } = await ctx.params;
  if (!recoveryAllowed()) return NextResponse.redirect(`${base}/signin`);
  if (!useRecoveryLink(code)) {
    return NextResponse.redirect(`${base}/signin?error=${encodeURIComponent("That sign-in link has expired or was already used. Ask for a new one.")}`);
  }
  await createSession(null, "recovery");
  console.warn("FML: someone signed in to admin with the one-time link from the log");
  return NextResponse.redirect(`${base}/admin`);
}
