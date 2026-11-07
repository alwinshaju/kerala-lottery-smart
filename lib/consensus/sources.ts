import type { Draw } from "../types";
import { WEEKLY, lotteryByCode } from "../schedule";
import { parseResultText } from "../scraper/lotisParser";

/**
 * UNOFFICIAL public sources. Each adapter returns a parsed Draw (never marked official) or null.
 * Be polite: a handful of requests per run, identifying User-Agent, no hammering.
 * NOTE: check each site's terms before using it commercially (kerala-lottery.net's terms restrict reproducing its content).
 */
const UA = "KeralaLotteryHub/1.0 (+informational; consensus check)";
const get = async (url: string, tries = 3): Promise<string> => {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.text();
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error(`${url}: ${(last as Error)?.message}`);
};

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&rarr;/g, "→")
    .replace(/[ \t]+/g, " ");
}

export interface Source { name: string; load(wanted: { code: string; drawNo: string; date: string }[]): Promise<Map<string, Draw>> }
const keyOf = (code: string, date: string) => `${code}-${date}`;

/* ---------- Source A: keralalotteries.net public Blogger feed ---------- */
export const feedSource: Source = {
  name: "keralalotteries.net (feed)",
  async load(wanted) {
    const q = new URLSearchParams({ alt: "json", "max-results": String(Math.min(60, Math.max(10, wanted.length * 3))) });
    const j = JSON.parse(await get(`https://www.keralalotteries.net/feeds/posts/default?${q}`));
    const out = new Map<string, Draw>();
    for (const e of j.feed?.entry ?? []) {
      const title: string = e.title?.$t ?? "";
      const d = title.match(/(\d{2})[-./](\d{2})[-./](\d{4})/), c = title.match(/\b([A-Z]{2})[\s.\-]*(\d{1,4})\b/);
      if (!d || !c || !WEEKLY.some((l) => l.code === c[1])) continue;
      const w = wanted.find((x) => x.code === c[1] && x.drawNo === `${c[1]}-${c[2]}`);
      if (!w) continue;
      const draw = parseResultText(htmlToText(e.content?.$t ?? ""), { code: w.code, name: lotteryByCode(w.code)!.name, drawNo: w.drawNo, date: w.date });
      draw.verified = false;
      const cur = out.get(keyOf(w.code, w.date));
      if (!cur || count(draw) > count(cur)) out.set(keyOf(w.code, w.date), draw); // several posts per draw: keep the fullest
    }
    return out;
  },
};

/* ---------- Source B: kerala-lottery.net per-draw result page ---------- */
export const klNetSource: Source = {
  name: "kerala-lottery.net",
  async load(wanted) {
    const out = new Map<string, Draw>();
    const lists = new Map<string, string>(); // code -> listing page html
    for (const w of wanted) {
      const lot = lotteryByCode(w.code)!;
      if (!lists.has(w.code)) lists.set(w.code, await get(`https://kerala-lottery.net/${lot.name.toLowerCase().replace(/[^a-z]+/g, "-")}-result/`));
      const html = lists.get(w.code)!;
      const i = html.indexOf(`<strong>${w.drawNo}</strong>`);
      const href = i >= 0 ? html.slice(i, i + 1500).match(/href="(https:\/\/kerala-lottery\.net\/\?id=\d+)/)?.[1] : undefined;
      if (!href) continue;
      const text = htmlToText(await get(href));
      // The page must itself say it is this draw and this date.
      const dn = text.match(/Draw Number\s+([A-Z]{2}-\d+)/)?.[1], dd = text.match(/Draw Date\s+(\d{2})\/(\d{2})\/(\d{4})/);
      if (dn !== w.drawNo || !dd || `${dd[3]}-${dd[2]}-${dd[1]}` !== w.date) continue;
      const draw = parseResultText(text, { code: w.code, name: lot.name, drawNo: w.drawNo, date: w.date });
      draw.verified = false;
      out.set(keyOf(w.code, w.date), draw);
    }
    return out;
  },
};

const count = (d: Draw) => Object.values(d.prizes).reduce((a, v) => a + (v as unknown[]).length, 0);
export const ALL_SOURCES: Source[] = [feedSource, klNetSource];
