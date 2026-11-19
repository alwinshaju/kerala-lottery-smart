import type { Draw } from "../../lib/types";
import { TIER_ORDER } from "../../lib/ticket";
import { matches, type GenOptions } from "../../lib/generator";
export interface HistoryEnding {
  ending: string;
  drawCount: number;
  lastSeen: string;
}
export interface HistorySummary {
  drawCount: number;
  excluded: number;
  /** Draws in this history that were checked against the official PDF. */
  officialDraws: number;
  from?: string;
  to?: string;
  endings: HistoryEnding[];
  signature: string;
}
export function summarizeHistory(input: Draw[]): HistorySummary {
  const eligible = [
    ...new Map(
      input
        .filter((d) => d.sourceStatus !== "conflict" || d.numbersAgree === true)
        .map((d) => [d.id, d]),
    ).values(),
  ];
  let fingerprint = 2166136261;
  const map = new Map<string, { drawCount: number; lastSeen: string }>();
  for (const d of eligible) {
    const seen = new Set<string>();
    for (const tier of TIER_ORDER)
      for (const w of d.prizes[tier]) {
        const digits = (typeof w === "string" ? w : w.ticket).replace(
          /\D/g,
          "",
        );
        if (digits.length >= 4) seen.add(digits.slice(-4));
      }
    for (const character of d.id + "|" + [...seen].sort().join(",")) {
      fingerprint ^= character.charCodeAt(0);
      fingerprint = Math.imul(fingerprint, 16777619);
    }
    // Count each ending once per draw. Consolation series must not inflate its frequency.
    for (const ending of seen) {
      const old = map.get(ending);
      map.set(ending, {
        drawCount: (old?.drawCount ?? 0) + 1,
        lastSeen: old && old.lastSeen > d.date ? old.lastSeen : d.date,
      });
    }
  }
  const dates = eligible.map((d) => d.date).sort();
  return {
    drawCount: eligible.length,
    excluded: input.length - eligible.length,
    officialDraws: eligible.filter((d) => d.source === "official_pdf").length,
    from: dates[0],
    to: dates.at(-1),
    endings: [...map.entries()]
      .map(([ending, value]) => ({ ending, ...value }))
      .sort(
        (a, b) => b.drawCount - a.drawCount || a.ending.localeCompare(b.ending),
      ),
    signature: String(fingerprint >>> 0),
  };
}
export interface HistoryIdea {
  number: string;
  ending: string;
  observedDraws: number;
  datasetDraws: number;
}
export function generateHistoryIdeas(
  summary: HistorySummary,
  options: GenOptions,
  random: () => number = Math.random,
): HistoryIdea[] {
  if (summary.drawCount < 20)
    throw new Error(
      "At least 20 nonconflicting draws are needed. Let history sync continue, or choose Random ideas.",
    );
  const pool = summary.endings.slice(0, 200);
  if (!pool.length)
    throw new Error("No usable historical endings are available.");
  const total = pool.reduce((s, r) => s + r.drawCount, 0);
  const output = new Map<string, HistoryIdea>();
  let attempts = 0;
  while (output.size < options.count && attempts++ < 20000) {
    let pick = random() * total;
    let selected = pool[pool.length - 1];
    for (const row of pool) {
      pick -= row.drawCount;
      if (pick < 0) {
        selected = row;
        break;
      }
    }
    const number = String(10 + Math.floor(random() * 90)) + selected.ending;
    if (matches(number, options))
      output.set(number, {
        number,
        ending: selected.ending,
        observedDraws: selected.drawCount,
        datasetDraws: summary.drawCount,
      });
  }
  if (output.size < options.count)
    throw new Error(
      "Not enough historical number ideas match these filters. Use Any mix / Any total.",
    );
  return [...output.values()];
}
