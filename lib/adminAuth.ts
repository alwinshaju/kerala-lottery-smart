import { timingSafeEqual } from "node:crypto";

const fails = new Map<string, { n: number; t: number }>();
const WINDOW = 10 * 60_000;

/** PIN check with constant-time compare and a simple per-IP lockout. Returns an error message or null when OK. */
export function checkAdminPin(req: Request): { error: string; status: number } | null {
  const want = process.env.ADMIN_PIN ?? "";
  if (want.length < 6) return { error: "ADMIN_PIN is missing or shorter than 6 characters in .env.local", status: 503 };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const f = fails.get(ip);
  if (f && f.n >= 8 && Date.now() - f.t < WINDOW) return { error: "Too many wrong PINs. Try again in 10 minutes.", status: 429 };
  const a = Buffer.from(req.headers.get("x-admin-pin") ?? ""), b = Buffer.from(want);
  if (a.length === b.length && timingSafeEqual(a, b)) { fails.delete(ip); return null; }
  fails.set(ip, { n: (f && Date.now() - f.t < WINDOW ? f.n : 0) + 1, t: Date.now() });
  return { error: "Wrong PIN", status: 401 };
}
