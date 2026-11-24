export function Flag({ src, name, size = 44, className = "", fluid = false }: { src: string | null; name: string; size?: number; className?: string; fluid?: boolean }) {
  const box = fluid ? undefined : { width: size, height: size };
  // keep small flags square: a fixed large radius turns a 16px flag into a circle
  const radius = !fluid && size <= 24 ? "rounded-[3px]" : !fluid && size <= 40 ? "rounded-md" : "rounded-lg";
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/flags/${src}`} alt="" width={size} height={size} className={`flex-none ${radius} object-cover bg-frost ${className}`} style={box} />
  ) : (
    <span className={`flex-none grid place-items-center ${radius} bg-frost text-ink-soft font-display font-semibold ${className}`} style={fluid ? undefined : { ...box, fontSize: size * 0.38 }} aria-hidden>
      {initials || "?"}
    </span>
  );
}
