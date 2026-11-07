import type { Draw } from "../types";
import { validateDraw } from "../scraper/lotisParser";
import { diffPrizes } from "../samePrizes";
import type { Source } from "./sources";

export interface Verdict { ok: boolean; draw?: Draw; reasons: string[]; agreeing: string[] }

/** A draw passes only if EVERY source returned it, each passes strict validation, and all prizes are identical. */
export function decide(per: { source: string; draw: Draw | null }[], minSources = 2): Verdict {
  const reasons: string[] = [];
  const have = per.filter((p) => p.draw);
  for (const p of per) if (!p.draw) reasons.push(`${p.source}: draw not found / not parseable`);
  if (have.length < minSources || have.length !== per.length) return { ok: false, reasons: reasons.length ? reasons : ["not enough sources"], agreeing: [] };
  for (const p of have) { const v = validateDraw(p.draw!); if (v.length) reasons.push(`${p.source}: ${v.join("; ")}`); }
  if (reasons.length) return { ok: false, reasons, agreeing: [] };
  const base = have[0].draw!;
  for (const p of have.slice(1)) { const d = diffPrizes(base, p.draw!); if (d.length) reasons.push(`${have[0].source} vs ${p.source}: ${d.join("; ")}`); }
  return reasons.length ? { ok: false, reasons, agreeing: [] } : { ok: true, draw: base, reasons: [], agreeing: have.map((h) => h.source) };
}

export type Secondary = "agree" | "unavailable" | "conflict";
export interface TieredVerdict { ok: boolean; draw?: Draw; source?: "consensus" | "feed"; secondary?: Secondary; reasons: string[] }

/**
 * Primary + secondary rule:
 *  - the PRIMARY source must pass strict validation, otherwise nothing is saved;
 *  - secondary agrees exactly  → source "consensus";
 *  - secondary missing/incomplete/invalid → source "feed";
 *  - secondary complete but DIFFERENT → still "feed", flagged "conflict" (callers must not alert the public).
 */
export function decideTiered(primary: { source: string; draw: Draw | null }, secondary: { source: string; draw: Draw | null }): TieredVerdict {
  if (!primary.draw) return { ok: false, reasons: [`${primary.source}: draw not found / not parseable`] };
  const pv = validateDraw(primary.draw);
  if (pv.length) return { ok: false, reasons: [`${primary.source}: ${pv.join("; ")}`] };
  if (!secondary.draw) return { ok: true, draw: primary.draw, source: "feed", secondary: "unavailable", reasons: [`${secondary.source}: not found`] };
  const sv = validateDraw(secondary.draw);
  if (sv.length) return { ok: true, draw: primary.draw, source: "feed", secondary: "unavailable", reasons: [`${secondary.source} incomplete: ${sv.slice(0, 2).join("; ")}`] };
  const d = diffPrizes(primary.draw, secondary.draw);
  if (d.length) return { ok: true, draw: primary.draw, source: "feed", secondary: "conflict", reasons: [`${primary.source} vs ${secondary.source}: ${d.join("; ")}`] };
  return { ok: true, draw: primary.draw, source: "consensus", secondary: "agree", reasons: [] };
}

export async function runConsensus(sources: Source[], wanted: { code: string; drawNo: string; date: string }[]) {
  const loaded = await Promise.all(sources.map(async (s) => ({ source: s.name, map: await s.load(wanted).catch((e) => { console.error(`${s.name}: ${e.message}`); return new Map<string, Draw>(); }) })));
  return wanted.map((w) => {
    const pick = (i: number) => ({ source: loaded[i].source, draw: loaded[i].map.get(`${w.code}-${w.date}`) ?? null });
    return { ...w, verdict: decideTiered(pick(0), pick(1)) };
  });
}
