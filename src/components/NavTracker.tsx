"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Counts page views in this tab so the back arrow knows whether there's a page of ours to go back to. */
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem("fml-views") || "0");
      sessionStorage.setItem("fml-views", String(n + 1));
    } catch {}
  }, [path]);
  return null;
}
