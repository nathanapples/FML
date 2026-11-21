export function Flag({ src, name, size = 44, className = "" }: { src: string | null; name: string; size?: number; className?: string }) {
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/flags/${src}`} alt="" width={size} height={size} className={`flex-none rounded-lg object-cover bg-frost ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span className={`flex-none grid place-items-center rounded-lg bg-frost text-ink-soft font-display font-semibold ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials || "?"}
    </span>
  );
}
