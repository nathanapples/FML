import Link from "next/link";
import { Glass } from "@/components/Marble";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-32 text-center">
      <Glass color="#a3adb8" size={56} className="mx-auto block" />
      <h1 className="mt-6 font-display text-4xl font-bold">This marble rolled off the track</h1>
      <p className="mt-2 text-ink-soft">The page you asked for doesn&apos;t exist.</p>
      <Link href="/" className="btn mt-6">Back to standings</Link>
    </main>
  );
}
