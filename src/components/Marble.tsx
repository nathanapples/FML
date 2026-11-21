import type { Marble as M } from "@/lib/season";

export function Marble({ m, size = 22, title, className = "", style }: { m: M | null | undefined; size?: number; title?: string; className?: string; style?: React.CSSProperties }) {
  if (!m) return <span className={`inline-block rounded-full border border-dashed border-ink-faint ${className}`} style={{ width: size, height: size }} title="Empty slot" />;
  return (
    <span
      role="img"
      aria-label={m.name}
      title={title ?? m.name}
      className={`marble ${m.flag ? "has-flag" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size,
        ["--c" as string]: m.color,
        ["--c2" as string]: m.color2 ?? "transparent",
        ...(m.flag ? { backgroundImage: `url(/flags/${m.flag})` } : {}),
        ...style,
      }}
    />
  );
}

export function MarbleLabel({ m, size = 20 }: { m: M | null | undefined; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Marble m={m} size={size} />
      <span className="truncate">{m?.name ?? "Empty"}</span>
    </span>
  );
}
