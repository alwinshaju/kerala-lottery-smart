import type { Draw, ResultsPayload } from "./types";
import { buildDemoDraws } from "./demoData";
import { rowToDraw } from "./rowMap";
import { validateDraw } from "./scraper/lotisParser";
import { diffPrizes } from "./samePrizes";

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export async function loadDraws(): Promise<ResultsPayload> {
  // Design/testing switch: show synthetic data even when Supabase is connected. Never enable in production.
  const forceDemo = process.env.USE_DEMO_DATA === "true";
  if (supabaseConfigured() && !forceDemo) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!);
    const { data, error } = await sb.from("draws").select("*").order("date", { ascending: false }).limit(1500);
    if (!error && data) {
      const draws = data.map(rowToDraw).filter((d): d is Draw => !!d);
      return { draws, source: "supabase", updatedAt: new Date().toISOString() };
    }
  }
  return { draws: buildDemoDraws(), source: "demo", updatedAt: new Date().toISOString() };
}

export type SaveResult = { alert: boolean; mismatch: string[]; skipped?: string };

/**
 * Saves a validated draw.
 *  - source "official_pdf": always wins. If a consensus row already existed, it is upgraded silently
 *    (users were already alerted); any difference between the two is reported in `mismatch`.
 *  - source "consensus": never overwrites an official row.
 * `alert` is true only the first time a draw becomes visible at all.
 */
export async function saveDraw(d: Draw, source: "official_pdf" | "consensus" | "feed" = "official_pdf"): Promise<SaveResult> {
  const errs = validateDraw(d);
  if (errs.length) throw new Error("Refusing to save invalid draw " + d.id + ": " + errs.join("; "));
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service role not configured");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: prev } = await sb.from("draws").select("*").eq("id", d.id).maybeSingle();
  if (prev?.verified && source !== "official_pdf") return { alert: false, mismatch: [], skipped: "already official" };
  const mismatch = prev && source === "official_pdf" && !prev.verified && rowToDraw(prev) ? diffPrizes(rowToDraw(prev)!, d) : [];
  const { error } = await sb.from("draws").upsert({
    id: d.id, code: d.code, name: d.name, draw_no: d.drawNo, date: d.date, pdf_url: d.pdfUrl ?? null,
    verified: source === "official_pdf", source, prizes: d.prizes, amounts: d.amounts ?? null,
  });
  if (error) throw error;
  return { alert: !prev, mismatch };
}
