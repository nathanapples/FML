"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * The back arrow on every detail page. Goes back to wherever you came from on this site;
 * if you arrived from elsewhere (a shared link), it goes to the page's parent list instead.
 */
export function BackLink({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        let fromHere = false;
        try {
          fromHere = Number(sessionStorage.getItem("fml-views") || "0") > 1 && window.history.length > 1;
        } catch {}
        if (fromHere) {
          e.preventDefault();
          router.back();
        }
      }}
      className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-white hover:text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
      Back
    </Link>
  );
}
