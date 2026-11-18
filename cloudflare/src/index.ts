import type { Draw } from "../../lib/types";

interface Env { DB: D1Database }

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS, ...extra } });

/** Public and read-only. Publishing happens in the separate admin worker. */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/api/draws" && req.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);
      const rows = await env.DB.prepare(
        "SELECT data, published_at FROM draws ORDER BY date DESC, published_at DESC LIMIT ?",
      ).bind(limit).all<{ data: string; published_at: string }>();
      const draws = (rows.results ?? []).map((r) => ({ ...(JSON.parse(r.data) as Draw), updatedAt: r.published_at }));
      return json({ draws, count: draws.length }, 200, { "cache-control": "public, max-age=60" });
    }
    return json({ error: "Not found" }, 404);
  },
};
