import Link from "next/link";
export function EmptySeason() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-bold">No season yet</h1>
      <p className="mt-3 text-ink-soft">Create a season in the admin area, add the competing marble teams and your league&apos;s teams, and the standings will appear here.</p>
      <Link href="/admin" className="btn mt-6">Open admin</Link>
    </main>
  );
}
