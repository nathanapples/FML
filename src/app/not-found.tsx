import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-32 text-center">
      <span className="marble mx-auto block" style={{ width: 56, height: 56, fontSize: 56, ["--c" as string]: "#a3adb8" }} />
      <h1 className="mt-6 font-display text-4xl font-bold">This marble rolled off the track</h1>
      <p className="mt-2 text-ink-soft">The page you asked for doesn&apos;t exist.</p>
      <Link href="/" className="btn mt-6">Back to standings</Link>
    </main>
  );
}
