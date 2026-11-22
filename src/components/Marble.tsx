import Link from "next/link";
import type { Marble as M } from "@/lib/season";

/**
 * A clear glass marble with a colour swirl inside. The swirl takes the team colour;
 * the second colour (if any) becomes the lighter ribbon running through it.
 */
export function Glass({ color, color2, size = 22, title, className = "", style, flag }: { color: string; color2?: string | null; size?: number; title?: string; className?: string; style?: React.CSSProperties; flag?: string | null }) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={`marble ${className}`}
      style={{ width: size, height: size, fontSize: size, ...style }}
    >
      {flag ? (
        <span className="absolute inset-[6%] rounded-full bg-cover bg-center" style={{ backgroundImage: `url(/flags/${flag})` }} />
      ) : (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          {/* the swirl: a leaning flame shape */}
          <path d="M20 87 C 2 60, 14 22, 80 6 C 66 30, 86 58, 66 80 C 54 93, 32 96, 20 87 Z" fill={color} />
          {/* the ribbon running through it */}
          <path d="M44 90 C 44 62, 58 34, 80 6 C 74 38, 78 62, 60 84 C 55 89, 49 91, 44 90 Z" fill={color2 ?? "#ffffff"} opacity={color2 ? 0.85 : 0.4} />
          {/* depth on the far side of the swirl */}
          <path d="M66 80 C 86 58, 66 30, 80 6 C 88 34, 92 62, 70 84 Z" fill="#000" opacity="0.2" />
        </svg>
      )}
      <span className="marble-shine" />
    </span>
  );
}

export function Marble({ m, size = 22, title, className = "", style }: { m: M | null | undefined; size?: number; title?: string; className?: string; style?: React.CSSProperties }) {
  if (!m) return <span className={`inline-block flex-none rounded-full border border-dashed border-ink-faint ${className}`} style={{ width: size, height: size }} title="Empty slot" />;
  return <Glass color={m.color} color2={m.color2} flag={m.flag} size={size} title={title ?? m.name} className={className} style={style} />;
}

/** A marble that opens that marble team's page. */
export function MarbleLink({ m, q, size = 22, className = "", children, title }: { m: M | null | undefined; q: string; size?: number; className?: string; children?: React.ReactNode; title?: string }) {
  if (!m) return <Marble m={m} size={size} />;
  return (
    <Link href={`/marbles/${encodeURIComponent(m.code)}${q}`} className={`relative z-10 inline-flex items-center gap-1.5 rounded-full transition-transform hover:-translate-y-0.5 ${className}`} title={title ?? m.name}>
      <Marble m={m} size={size} title={title} />
      {children}
    </Link>
  );
}

export function MarbleLabel({ m, size = 20 }: { m: M | null | undefined; size?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Marble m={m} size={size} />
      <span className="truncate">{m?.name ?? "Empty"}</span>
    </span>
  );
}
