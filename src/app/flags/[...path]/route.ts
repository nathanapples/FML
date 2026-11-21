import fs from "node:fs";
import path from "node:path";
import { FLAG_DIR } from "@/lib/db";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" };

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const root = path.resolve(FLAG_DIR);
  const file = path.resolve(root, ...parts.map((p) => decodeURIComponent(p)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300", ...(type === "image/svg+xml" ? { "Content-Security-Policy": "sandbox" } : {}) },
  });
}
