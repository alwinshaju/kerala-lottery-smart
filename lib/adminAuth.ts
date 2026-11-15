import { timingSafeEqual } from "node:crypto";

const fails = new Map<string, { n: number; t: number }>();
const WINDOW = 10 * 60_000;
const GLOBAL = "*global*";

/** PIN check with constant-time compare and a simple per-IP lockout. Returns an error message or null when OK. */
export function checkAdminPin(req: Request): { error: string; status: number } | null {
  const want = process.env.ADMIN_PIN ?? "";
  if (want.length < 6) return { error: "ADMIN_PIN is missing or shorter than 6 characters in .env.local", status: 503 };
  // The client controls the FIRST x-forwarded-for entry; the LAST one is added by the platform proxy.
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = req.headers.get("x-real-ip") ?? xff?.[xff.length - 1] ?? "local";
  const now = Date.now();
  const f = fails.get(ip), g = fails.get(GLOBAL);
  // Per-IP lockout, plus a global cap so rotating addresses cannot brute-force the PIN.
  if ((f && f.n >= 8 && now - f.t < WINDOW) || (g && g.n >= 40 && now - g.t < WINDOW)) return { error: "Too many wrong PINs. Try again in 10 minutes.", status: 429 };
  const a = Buffer.from(req.headers.get("x-admin-pin") ?? ""), b = Buffer.from(want);
  if (a.length === b.length && timingSafeEqual(a, b)) { fails.delete(ip); return null; }
  fails.set(ip, { n: (f && now - f.t < WINDOW ? f.n : 0) + 1, t: now });
  fails.set(GLOBAL, { n: (g && now - g.t < WINDOW ? g.n : 0) + 1, t: g && now - g.t < WINDOW ? g.t : now });
  return { error: "Wrong PIN", status: 401 };
}
