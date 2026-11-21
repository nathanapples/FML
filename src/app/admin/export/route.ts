import { isAdmin } from "@/lib/auth";
import { exportBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return new Response("Sign in to admin first.", { status: 401 });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(exportBackup()), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="fml-backup-${stamp}.json"` },
  });
}
