import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authSettings, FLOW_COOKIE, oidcDiscovery, oidcRedirectUri, publicBase, sign } from "@/lib/auth";

export const dynamic = "force-dynamic";

const safeBack = (b: string | null) => (b && b.startsWith("/") && !b.startsWith("//") ? b : "/");

export async function GET(req: Request) {
  const base = await publicBase();
  const back = safeBack(new URL(req.url).searchParams.get("back"));
  const s = authSettings();
  if (s.mode !== "oidc") return NextResponse.redirect(`${base}/signin`);
  try {
    const { d } = await oidcDiscovery();
    const state = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    (await cookies()).set(FLOW_COOKIE, sign(JSON.stringify({ state, nonce, verifier, back })), {
      httpOnly: true,
      sameSite: "lax",
      secure: base.startsWith("https://") || process.env.COOKIE_SECURE === "true",
      path: "/auth/oidc",
      maxAge: 600,
    });
    const url = new URL(d.authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: s.clientId,
      redirect_uri: await oidcRedirectUri(),
      scope: s.adminGroup ? "openid email profile groups" : "openid email profile",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    return NextResponse.redirect(url.toString());
  } catch (err) {
    return NextResponse.redirect(`${base}/signin?error=${encodeURIComponent((err as Error).message)}&back=${encodeURIComponent(back)}`);
  }
}
