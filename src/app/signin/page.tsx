import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authSettings, passwordLoginAllowed, recoveryAllowed, viewer } from "@/lib/auth";
import { LogoMarbles } from "@/components/SiteHeader";
import { PasswordForm, RecoveryButton } from "./SignInForms";

export const dynamic = "force-dynamic";

const safeBack = (b: unknown) => (typeof b === "string" && b.startsWith("/") && !b.startsWith("//") ? b : "");

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  db();
  const sp = await searchParams;
  const back = safeBack(sp.back);
  const error = typeof sp.error === "string" ? sp.error : null;
  const v = await viewer();
  if (v && (!back || back !== "/admin" || v.admin)) redirect(back || (v.user ? "/account" : "/admin"));
  const s = authSettings();
  const oidc = s.mode === "oidc";

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex items-center gap-2.5">
          <LogoMarbles size={30} />
          <span className="font-display text-3xl font-bold">FML</span>
        </Link>
        <div className="rounded-2xl bg-board p-6 shadow-[0_12px_32px_-18px_rgb(11_42_74_/_0.35)]">
          <h1 className="font-display text-3xl font-bold">Sign in</h1>
          {v && back === "/admin" && !v.admin && <p className="mt-2 text-ink-soft">Your account isn&apos;t an admin. Ask an admin to make you one.</p>}
          {error && <p className="mt-4 rounded-lg bg-redline/10 px-3 py-2 text-sm text-redline" role="alert">{error}</p>}

          {oidc ? (
            <>
              <p className="mt-2 text-ink-soft">Sign in to edit your account and link it to your fantasy teams.</p>
              <a href={`/auth/oidc/start?back=${encodeURIComponent(back || "/")}`} className="btn mt-5 w-full justify-center py-3 text-base">
                Sign in with {s.label}
              </a>
              {recoveryAllowed() && <RecoveryButton />}
            </>
          ) : passwordLoginAllowed() ? (
            <>
              <p className="mt-2 text-ink-soft">The admin password opens the admin pages.</p>
              <PasswordForm back={back || "/admin"} />
            </>
          ) : (
            <p className="mt-3 text-ink-soft">
              Sign-in is switched off. Set <code className="font-semibold text-ink">ADMIN_PASSWORD</code> in your compose file and redeploy, then turn on single sign-on from Admin.
            </p>
          )}
        </div>
        <p className="mt-5 text-center text-sm"><Link href="/" className="text-ink-soft hover:text-ink">Back to the league</Link></p>
      </div>
    </main>
  );
}
