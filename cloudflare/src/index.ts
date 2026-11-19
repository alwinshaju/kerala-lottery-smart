import type { Draw } from "../../lib/types";

interface Env { DB: D1Database }

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS" };
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
    if (url.pathname === "/api/ping" && req.method === "POST") {
      // Anonymous usage count: a random id made by the app. Nothing personal is stored.
      let b: { id?: unknown; v?: unknown; p?: unknown } = {};
      try { b = (await req.json()) as typeof b; } catch { /* ignore */ }
      const id = typeof b.id === "string" && /^[A-Za-z0-9-]{16,64}$/.test(b.id) ? b.id : null;
      if (!id) return json({ error: "Bad id" }, 400);
      const v = typeof b.v === "string" ? b.v.slice(0, 16) : null;
      const plat = b.p === "android" || b.p === "ios" ? b.p : "other";
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO devices (id, first_seen, last_seen, app_version, platform) VALUES (?1,?2,?2,?3,?4) " +
            "ON CONFLICT(id) DO UPDATE SET last_seen=?2, app_version=?3, platform=?4",
        ).bind(id, now, v, plat),
        env.DB.prepare("INSERT OR IGNORE INTO device_days (day, id) VALUES (?1,?2)").bind(now.slice(0, 10), id),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  },
};
