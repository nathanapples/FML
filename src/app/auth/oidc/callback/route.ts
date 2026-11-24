import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authSettings, createSession, FLOW_COOKIE, oidcFinish, publicBase, SignInError, unsign } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = await publicBase();
  const jar = await cookies();
  const raw = unsign(jar.get(FLOW_COOKIE)?.value);
  jar.delete({ name: FLOW_COOKIE, path: "/auth/oidc" });
  const fail = (msg: string) => {
    console.warn(`FML sign-in failed: ${msg}`);
    return NextResponse.redirect(`${base}/signin?error=${encodeURIComponent(msg)}`);
  };
  if (authSettings().mode !== "oidc") return NextResponse.redirect(`${base}/signin`);
  if (!raw) return fail("The sign-in took too long or started in another browser. Try again.");
  try {
    const flow = JSON.parse(raw) as { state: string; nonce: string; verifier: string; back: string };
    const user = await oidcFinish(new URL(req.url).searchParams, flow);
    await createSession(user.id, "oidc");
    const back = flow.back && flow.back !== "/" ? flow.back : user.player_id ? "/" : "/account?welcome=1";
    return NextResponse.redirect(`${base}${back}`);
  } catch (err) {
    return fail(err instanceof SignInError ? err.message : `Sign-in failed: ${(err as Error).message}`);
  }
}
