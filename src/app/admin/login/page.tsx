import { adminEnabled, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="marble" style={{ width: 36, height: 36, fontSize: 36, ["--c" as string]: "#d7263d" }} />
          <h1 className="font-display text-3xl font-bold">FML admin</h1>
        </div>
        {adminEnabled() ? (
          <LoginForm />
        ) : (
          <p className="rounded-xl bg-board p-5 text-ink-soft">
            Admin is switched off because <code className="font-semibold text-ink">ADMIN_PASSWORD</code> isn&apos;t set. Add it to the environment in your compose file and redeploy.
          </p>
        )}
      </div>
    </main>
  );
}
