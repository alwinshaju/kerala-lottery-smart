import * as cheerio from "cheerio";
import type { Draw, TicketWin } from "../types";
import { isoDate, lotteryByCode, nowIST } from "../schedule";

export const LOTIS_URL = "https://www.lotteryagent.kerala.gov.in/result/public/";

export interface ListingRow { name: string; code: string; drawNo: string; date: string; itemId?: string; pdfUrl?: string }

/**
 * Step 1: read the LOTIS listing table.
 * Row format observed: "SUVARNA KERALAM-10/11/2025 (SK-76)" | "06-11-2026" | Download button.
 * NOTE: LOTIS gates each PDF download behind a CAPTCHA (captchaverificationaction). We do NOT bypass it;
 * the listing gives us draw numbers/dates, and the PDF must come from an admin upload (see /api/admin/ingest)
 * or any direct, non-CAPTCHA URL (pdfUrl) when one is available.
 */
async function fetchWithRetry(url: string, tries = 4): Promise<string> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "KeralaLotteryHub/1.0 (+informational)" }, cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error(`LOTIS unreachable after ${tries} tries: ${(last as Error)?.message}`);
}

export async function fetchListing(html?: string): Promise<ListingRow[]> {
  const body = html ?? (await fetchWithRetry(LOTIS_URL));
  const $ = cheerio.load(body);
  const rows: ListingRow[] = [];
  $("#example tbody tr, #example tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const label = $(tds[1]).text().trim();
    const m = label.match(/^(.*?)-\d{2}\/\d{2}\/\d{4}\s*\(([A-Z]+)-(\d+)\)/);
    const dm = $(tds[2]).text().trim().match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!m || !dm) return;
    const a = $(tds[3]).find("a");
    const href = a.attr("href");
    rows.push({
      name: m[1].replace(/-/g, " ").trim(), code: m[2], drawNo: `${m[2]}-${m[3]}`,
      date: `${dm[3]}-${dm[2]}-${dm[1]}`, itemId: a.attr("data-item-id"),
      pdfUrl: href && href !== "#" ? new URL(href, LOTIS_URL).toString() : undefined,
    });
  });
  return rows;
}

const TICKET = /\b([A-Z]{2})\s?(\d{6})\b/g;
const asWin = (m: RegExpMatchArray, district?: string): TicketWin => ({ ticket: `${m[1]} ${m[2]}`, ...(district ? { district: district.trim() } : {}) });

/** Strips noise that sits on header lines (amounts, "(Common to all series)", "[1 Crore]") so numbers after a header are kept. */
function normalise(text: string) {
  return text
    .replace(/\r/g, "").replace(/\u00a0/g, " ")
    .replace(/^.*Modernization & IT Software Division.*$/gim, " ")   // page footer lines break the 4-digit runs
    .replace(/^\s*Page\s+\d+\b.*$/gim, " ")
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, " ")
    .replace(/\bRs\b\s*\.?\s*:?\s*[\d,]+\s*\/?\s*-?/g, " ")  // case-sensitive: the ticket series "RS" must survive
    .replace(/₹\s*[\d,]+\s*\/?\s*-?/g, " ")
    .replace(/\bADVERTISEMENT\b/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((?:Common|Remaining|Last|For|Drawn)[^)]*\)/gi, " ");
}

type K = "first" | "second" | "third" | "cons" | "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth";
const HEADERS: [K, RegExp][] = [
  ["first", /1st\s*Prize/gi], ["second", /2nd\s*Prize/gi], ["third", /3rd\s*Prize/gi], ["cons", /Cons(?:olation)?\s*Prize/gi],
  ["fourth", /4th\s*Prize/gi], ["fifth", /5th\s*Prize/gi], ["sixth", /6th\s*Prize/gi], ["seventh", /7th\s*Prize/gi], ["eighth", /8th\s*Prize/gi], ["ninth", /9th\s*Prize/gi],
];

/** Each section runs from its header to the nearest following header of ANY tier (layouts differ: consolation may sit between 1st and 2nd). */
function sections(t: string): Partial<Record<K, string>> {
  const marks: { k: K; start: number; end: number }[] = [];
  for (const [k, re] of HEADERS) { const m = re.exec(t); re.lastIndex = 0; if (m) marks.push({ k, start: m.index, end: m.index + m[0].length }); }
  marks.sort((a, b) => a.start - b.start);
  const out: Partial<Record<K, string>> = {};
  marks.forEach((m, i) => { out[m.k] = t.slice(m.end, marks[i + 1]?.start ?? t.length); });
  return out;
}

/** Step 2: parse raw result text (PDF or public page text). Layouts vary; always spot-check. */
export function parseResultText(text: string, meta: { code: string; name: string; drawNo: string; date: string; pdfUrl?: string }): Draw {
  const seg = sections(normalise(text));
  const withDistrict = (s = ""): TicketWin[] => {
    const out: TicketWin[] = []; const re = /([A-Z]{2})\s?(\d{6})\s*\(([A-Z][A-Z\s]+)\)/g; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) out.push({ ticket: `${m[1]} ${m[2]}`, district: m[3].trim() });
    return out;
  };
  const plain = (s = ""): TicketWin[] => [...new Map([...s.matchAll(TICKET)].map((m) => [m[0], asWin(m)])).values()];
  // 4-digit tiers: only the unbroken run of 4-digit tokens right after the header (stops before dates, notes, agent lines).
  const fours = (s = ""): string[] => {
    const out: string[] = [];
    for (const tok of s.replace(/[|,]/g, " ").trim().split(/\s+/)) { if (/^\d{4}$/.test(tok)) out.push(tok); else if (tok === "-" || tok === "---" || tok === ":" || tok === "–") continue; else break; }
    return [...new Set(out)].sort();
  };
  return {
    id: `${meta.code}-${meta.date}`, code: meta.code, name: meta.name, drawNo: meta.drawNo, date: meta.date, pdfUrl: meta.pdfUrl,
    verified: true,
    prizes: {
      first: withDistrict(seg.first), second: withDistrict(seg.second), third: withDistrict(seg.third),
      consolation: plain(seg.cons),
      fourth: fours(seg.fourth), fifth: fours(seg.fifth), sixth: fours(seg.sixth), seventh: fours(seg.seventh), eighth: fours(seg.eighth), ninth: fours(seg.ninth),
    },
  };
}

/** Reads the PDF's own header: "BHAGYATHARA LOTTERY NO.BT-78th DRAW held on:- 02/11/2026,3:00 PM". */
export function identifyPdf(text: string): { code: string; no: string; date: string } | null {
  const m = text.match(/LOTTERY\s*NO\.?\s*([A-Z]{2})\s*[-–]?\s*(\d{1,5})\s*(?:st|nd|rd|th)?\s*DRAW\s*held\s*on\s*:?-?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  return m ? { code: m[1].toUpperCase(), no: m[2], date: `${m[5]}-${m[4]}-${m[3]}` } : null;
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try { return (await parser.getText()).text; } finally { await parser.destroy?.(); }
}

export async function parsePdfBuffer(buf: Buffer, meta: Parameters<typeof parseResultText>[1]): Promise<Draw> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try { const { text } = await parser.getText(); return parseResultText(text, meta); } finally { await parser.destroy?.(); }
}

const TICKET_RE = /^[A-Z]{2} \d{6}$/;
const FOUR_RE = /^\d{4}$/;
const DISTRICT_RE = /^[A-Z][A-Z .]{2,}$/;

/**
 * Strict gate: returns a list of problems; an empty list means the draw is safe to store.
 * Anything partial, duplicated, mis-dated or oddly formatted is rejected, never "fixed up".
 */
export function validateDraw(d: Draw, now = new Date()): string[] {
  const e: string[] = [];
  const lot = lotteryByCode(d.code);
  if (!lot || lot.weekday == null) e.push(`unknown weekly lottery code "${d.code}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.push(`bad date "${d.date}"`);
  else {
    const dt = new Date(d.date + "T00:00:00");
    if (isNaN(+dt)) e.push("unreadable date");
    else {
      if (lot?.weekday != null && dt.getDay() !== lot.weekday) e.push(`${d.code} is drawn on weekday ${lot.weekday}, but ${d.date} is weekday ${dt.getDay()}`);
      if (d.date > isoDate(nowIST(now))) e.push("draw date is in the future");
    }
  }
  if (d.id !== `${d.code}-${d.date}`) e.push("id does not match code and date");
  if (!new RegExp(`^${d.code}-\\d{1,5}$`).test(d.drawNo)) e.push(`draw number "${d.drawNo}" should look like ${d.code}-76`);

  const p = d.prizes;
  const tickets = (tier: "first" | "second" | "third" | "consolation", min: number, max: number, needDistrict: boolean) => {
    const list = p[tier];
    if (list.length < min || list.length > max) e.push(`${tier}: expected ${min === max ? min : `${min}–${max}`} ticket(s), found ${list.length}`);
    for (const w of list) {
      if (!TICKET_RE.test(w.ticket)) e.push(`${tier}: invalid ticket "${w.ticket}"`);
      if (needDistrict && !(w.district && DISTRICT_RE.test(w.district))) e.push(`${tier}: missing/invalid district for ${w.ticket}`);
    }
    if (new Set(list.map((w) => w.ticket)).size !== list.length) e.push(`${tier}: duplicate tickets`);
  };
  tickets("first", 1, 1, true); tickets("second", 1, 1, true); tickets("third", 1, 12, true); tickets("consolation", 1, 30, false);

  // Integrity check: consolation tickets are the 1st-prize number in the other series.
  if (p.first[0] && p.consolation.length) {
    const n = p.first[0].ticket.slice(-6);
    for (const w of p.consolation) if (!w.ticket.endsWith(n)) e.push(`consolation ${w.ticket} does not share the 1st-prize digits ${n}`);
    const series = new Set([p.first[0].ticket.slice(0, 2), ...p.consolation.map((w) => w.ticket.slice(0, 2))]);
    if (series.size !== p.consolation.length + 1) e.push("consolation series are duplicated or overlap the 1st-prize series");
  }

  const fours = (tier: "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth", required: boolean) => {
    const list = p[tier];
    if (required && list.length < 1) e.push(`${tier}: no numbers found`);
    if (list.length > 400) e.push(`${tier}: implausible count ${list.length}`);
    for (const n of list) if (!FOUR_RE.test(n)) e.push(`${tier}: invalid number "${n}"`);
    if (new Set(list).size !== list.length) e.push(`${tier}: duplicate numbers`);
  };
  fours("fourth", true); fours("fifth", true); fours("sixth", true); fours("seventh", true); fours("eighth", true); fours("ninth", false);
  return e;
}

export const looksComplete = (d: Draw) => validateDraw(d).length === 0;
