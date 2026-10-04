import "server-only";

// Cloudflare Workers AI, multilingual embeddings (@cf/baai/bge-m3, 1024 dims, handles Hindi, Hinglish and English).
// Free tier: 10,000 neurons a day; a typed symptom costs a tiny fraction of that.
// The text is sent only to be turned into numbers. It is never stored or logged here.
export const EMBED_MODEL = "@cf/baai/bge-m3";

export class MatchUnavailable extends Error {}

export const providerConfigured = () => !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

export async function embed(texts: string[]): Promise<number[][]> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !token) throw new MatchUnavailable("provider not configured");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${EMBED_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts }),
    cache: "no-store",
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) throw new MatchUnavailable(`provider error ${res.status}`);
  const data = j.result?.data ?? j.result?.response ?? j.data;
  if (!Array.isArray(data) || data.length !== texts.length) throw new MatchUnavailable("unexpected provider response");
  return data as number[][];
}
