import type { Draw, Tier } from "./types";
import { TIER_ORDER, ordinal } from "./ticket";

export interface Hit { tier: Tier; tierLabel: string; four: string; draw: Draw; ticket?: string }

const daysAgo = (date: string, now = new Date()) => (now.getTime() - new Date(date + "T00:00:00").getTime()) / 86400000;
export const within = (draws: Draw[], days: number | null) =>
  days == null ? draws : draws.filter((d) => daysAgo(d.date) <= days);

/** Every 4-digit "ending" that won something, in every draw. */
export function allHits(draws: Draw[]): Hit[] {
  const hits: Hit[] = [];
  for (const draw of draws) {
    for (const tier of TIER_ORDER) {
      const v = draw.prizes[tier] as any[];
      for (const w of v) {
        if (typeof w === "string") hits.push({ tier, tierLabel: ordinal[tier], four: w, draw });
        else hits.push({ tier, tierLabel: ordinal[tier], four: w.ticket.replace(/\D/g, "").slice(-4), draw, ticket: w.ticket });
      }
    }
  }
  return hits;
}

export function searchFour(draws: Draw[], four: string) {
  const hits = allHits(draws).filter((h) => h.four === four);
  const recent = hits.filter((h) => daysAgo(h.draw.date) <= 90).sort((a, b) => b.draw.date.localeCompare(a.draw.date));
  return { recent, allTime: hits.length, last90: recent.length };
}

export function frequency(draws: Draw[], days: number | null, digits: 3 | 4) {
  const m = new Map<string, number>();
  for (const h of allHits(within(draws, days))) {
    const k = h.four.slice(-digits);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([n, c]) => ({ n, c })).sort((a, b) => b.c - a.c || a.n.localeCompare(b.n));
}

export const hotPicks = (draws: Draw[], digits: 3 | 4 = 4, top = 10) => frequency(draws, 28, digits).slice(0, top);
export const repeats = (draws: Draw[], days: number | null, min = 2) => frequency(draws, days, 4).filter((x) => x.c >= min);

/** 4-digit combinations (0000–9999) not seen within the last `days`. */
export function cold(draws: Draw[], days: number) {
  const seen = new Set(allHits(within(draws, days)).map((h) => h.four));
  const out: string[] = [];
  for (let i = 0; i < 10000; i++) { const s = String(i).padStart(4, "0"); if (!seen.has(s)) out.push(s); }
  return out;
}

export function topDistricts(draws: Draw[], days: number | null, top = 5) {
  const m = new Map<string, number>();
  for (const d of within(draws, days)) for (const w of d.prizes.first) if (w.district) m.set(w.district, (m.get(w.district) ?? 0) + 1);
  return [...m.entries()].map(([district, wins]) => ({ district, wins })).sort((a, b) => b.wins - a.wins).slice(0, top);
}

function hash(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * Smart Picks, frozen between draws: everything is measured relative to the latest draw's date
 * (not "today") and seeded by the latest draw id, so the picks only change when a new result arrives.
 * Recency-weighted frequency of winning endings; not a prediction.
 */
export function smartPicks(draws: Draw[], digits: 3 | 4, count = 6, code?: string) {
  if (!draws.length) return [];
  const latest = draws.reduce((a, b) => (a.date >= b.date ? a : b));
  const ref = new Date(latest.date + "T00:00:00");
  const weights = new Map<string, number>();
  for (const h of allHits(draws)) {
    const age = daysAgo(h.draw.date, ref);
    if (age > 90 || age < 0) continue;
    let w = 1 + Math.max(0, 30 - age) / 30;
    if (code && h.draw.code === code) w *= 2; // this lottery's own history counts double
    const k = h.four.slice(-digits);
    weights.set(k, (weights.get(k) ?? 0) + w);
  }
  return [...weights.entries()]
    .map(([n, w]) => ({ n, score: w + (hash(latest.id + (code ?? "") + n) % 100) / 100 }))
    .sort((a, b) => b.score - a.score).slice(0, count);
}
