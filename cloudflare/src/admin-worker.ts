import { ADMIN_HTML } from "./admin";
import { parsePdfText } from "./parse";
import { verifyAccessJwt } from "./access";

interface Env { DB: D1Database; TEAM_DOMAIN?: string; POLICY_AUD?: string; ALLOWED_EMAILS?: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Admin only. Cloudflare Access signs you in; this code checks that sign-in again. */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const user = await verifyAccessJwt(req.headers.get("cf-access-jwt-assertion"), {
      teamDomain: env.TEAM_DOMAIN ?? "",
      aud: env.POLICY_AUD ?? "",
    });
    const allowed = (env.ALLOWED_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    if (!user || (allowed.length && !allowed.includes(user.email.toLowerCase())))
      return json({ error: "Sign in with Cloudflare Access first." }, 401);

    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/admin")
      return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

    if (url.pathname === "/api/admin/draws" && req.method === "GET") {
      const rows = await env.DB.prepare("SELECT data FROM draws ORDER BY date DESC LIMIT 100").all<{ data: string }>();
      return json({ draws: (rows.results ?? []).map((r) => JSON.parse(r.data)) });
    }
    if (url.pathname === "/api/admin/stats" && req.method === "GET") {
      const one = async <T,>(sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first<T>()) as T;
      const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
      const [total, today, week, month, newWeek, draws, last] = await Promise.all([
        one<{ n: number }>("SELECT COUNT(*) n FROM devices"),
        one<{ n: number }>("SELECT COUNT(*) n FROM device_days WHERE day = ?", day(0)),
        one<{ n: number }>("SELECT COUNT(DISTINCT id) n FROM device_days WHERE day >= ?", day(6)),
        one<{ n: number }>("SELECT COUNT(DISTINCT id) n FROM device_days WHERE day >= ?", day(29)),
        one<{ n: number }>("SELECT COUNT(*) n FROM devices WHERE first_seen >= ?", day(6)),
        one<{ n: number; codes: number }>("SELECT COUNT(*) n, COUNT(DISTINCT code) codes FROM draws"),
        one<{ at: string | null }>("SELECT MAX(published_at) at FROM draws"),
      ]);
      const series = (await env.DB.prepare(
        "SELECT day, COUNT(*) n FROM device_days WHERE day >= ? GROUP BY day",
      ).bind(day(13)).all<{ day: string; n: number }>()).results ?? [];
      const by = new Map(series.map((r) => [r.day, r.n]));
      const joined = (await env.DB.prepare(
        "SELECT substr(first_seen,1,10) day, COUNT(*) n FROM devices WHERE first_seen >= ? GROUP BY day",
      ).bind(day(13)).all<{ day: string; n: number }>()).results ?? [];
      const jb = new Map(joined.map((r) => [r.day, r.n]));
      const days = Array.from({ length: 14 }, (_, i) => day(13 - i)).map((d) => ({ day: d, active: by.get(d) ?? 0, joined: jb.get(d) ?? 0 }));
      const versions = (await env.DB.prepare(
        "SELECT COALESCE(app_version,'?') v, COUNT(*) n FROM devices GROUP BY v ORDER BY n DESC LIMIT 6",
      ).all<{ v: string; n: number }>()).results ?? [];
      return json({
        users: { total: total.n, activeToday: today.n, active7: week.n, active30: month.n, new7: newWeek.n },
        content: { draws: draws.n, lotteries: draws.codes, lastPublished: last.at },
        days, versions, email: user.email,
      });
    }
    if (url.pathname === "/api/admin/preview" && req.method === "POST") {
      const { text } = (await req.json()) as { text?: string };
      return text ? json(parsePdfText(text)) : json({ error: "No text" }, 400);
    }
    if (url.pathname === "/api/admin/publish" && req.method === "POST") {
      const { text } = (await req.json()) as { text?: string };
      if (!text) return json({ error: "No text" }, 400);
      const { draw, problems } = parsePdfText(text); // re-checked here, never trust the browser
      if (!draw || problems.length) return json({ error: "This PDF did not pass the checks.", problems }, 422);
      await env.DB.prepare(
        "INSERT INTO draws (id, code, draw_no, date, data, published_at) VALUES (?1,?2,?3,?4,?5,?6) " +
          "ON CONFLICT(id) DO UPDATE SET draw_no=?3, date=?4, data=?5, published_at=?6",
      ).bind(draw.id, draw.code, draw.drawNo, draw.date, JSON.stringify(draw), new Date().toISOString()).run();
      return json({ ok: true, id: draw.id, drawNo: draw.drawNo, date: draw.date });
    }
    if (url.pathname.startsWith("/api/admin/draws/") && req.method === "DELETE") {
      await env.DB.prepare("DELETE FROM draws WHERE id = ?").bind(decodeURIComponent(url.pathname.split("/").pop() ?? "")).run();
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  },
};
