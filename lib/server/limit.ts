import "server-only";

// Small in-memory limiter (per server instance). Good enough to blunt abuse on the free tier.
const hits = new Map<string, { n: number; t: number }>();
export function limited(key: string, max: number, windowMs = 60000) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > max;
}
export const ipOf = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
