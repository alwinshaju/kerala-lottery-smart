import type { Draw, TicketWin } from "./types";
import { isoDate, lotteryByCode, nowIST } from "./schedule";
import { isBumperDraw } from "./rowMap";
export { isBumperDraw };

const TICKET = /\b([A-Z]{2})\s?(\d{6})\b/g;
const asWin = (m: RegExpMatchArray, district?: string): TicketWin => ({
  ticket: `${m[1]} ${m[2]}`,
  ...(district ? { district: district.trim() } : {}),
});

/** Strips noise that sits on header lines (amounts, "(Common to all series)", "[1 Crore]") so numbers after a header are kept. */
function normalise(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/^.*Modernization & IT Software Division.*$/gim, " ") // page footer lines break the 4-digit runs
    .replace(/^\s*Page\s+\d+\b.*$/gim, " ")
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, " ")
    .replace(/\bRs\b\s*\.?\s*:?\s*[\d,]+\s*\/?\s*-?/g, " ") // case-sensitive: the ticket series "RS" must survive
    .replace(/₹\s*[\d,]+\s*\/?\s*-?/g, " ")
    .replace(/\bADVERTISEMENT\b/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((?:Common|Remaining|Last|For|Drawn)[^)]*\)/gi, " ")
    .replace(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/g, " ") // strip dates so years are not treated as 4-digit winners
    .replace(/The prize winners are advised[\s\S]*$/gi, " "); // strip bottom disclaimers
}

type K =
  | "first"
  | "second"
  | "third"
  | "cons"
  | "fourth"
  | "fifth"
  | "sixth"
  | "seventh"
  | "eighth"
  | "ninth";
const HEADERS: [K, RegExp][] = [
  ["first", /1st\s*Prize/gi],
  ["second", /2nd\s*Prize/gi],
  ["third", /3rd\s*Prize/gi],
  ["cons", /Cons(?:olation)?\s*Prize/gi],
  ["fourth", /4th\s*Prize/gi],
  ["fifth", /5th\s*Prize/gi],
  ["sixth", /6th\s*Prize/gi],
  ["seventh", /7th\s*Prize/gi],
  ["eighth", /8th\s*Prize/gi],
  ["ninth", /9th\s*Prize/gi],
];

/** Each section runs from its header to the nearest following header of ANY tier (layouts differ: consolation may sit between 1st and 2nd). */
function sections(t: string): Partial<Record<K, string>> {
  const marks: { k: K; start: number; end: number }[] = [];
  for (const [k, re] of HEADERS) {
    const m = re.exec(t);
    re.lastIndex = 0;
    if (m) marks.push({ k, start: m.index, end: m.index + m[0].length });
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Partial<Record<K, string>> = {};
  marks.forEach((m, i) => {
    out[m.k] = t.slice(m.end, marks[i + 1]?.start ?? t.length);
  });
  return out;
}

/** Step 2: parse raw result text (PDF or public page text). Layouts vary; always spot-check. */
export function parseResultText(
  text: string,
  meta: {
    code: string;
    name: string;
    drawNo: string;
    date: string;
    pdfUrl?: string;
  },
): Draw {
  const isBumper = isBumperDraw(meta.code, meta.drawNo);
  const seg = sections(normalise(text));

  const withDistrict = (s = ""): TicketWin[] => {
    const out: TicketWin[] = [];
    const re = /([A-Z]{2})\s?(\d{6})(?:\s*\(([^)]+)\)|\s+([A-Z][A-Z\s]{2,}))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const loc = (m[3] || m[4] || "").trim();
      out.push({
        ticket: `${m[1]} ${m[2]}`,
        ...(loc ? { district: loc } : {}),
      });
    }
    return out;
  };

  const plain = (s = ""): TicketWin[] => [
    ...new Map([...s.matchAll(TICKET)].map((m) => [m[0], asWin(m)])).values(),
  ];

  const fours = (s = ""): string[] => {
    const out: string[] = [];
    for (const tok of s.replace(/[|,]/g, " ").trim().split(/\s+/)) {
      if (/^\d{4}$/.test(tok)) {
        out.push(tok);
      } else if (tok === "-" || tok === "---" || tok === ":" || tok === "–") {
        continue;
      } else if (!isBumper) {
        break;
      }
    }
    return [...new Set(out)].sort();
  };

  const parseFullOrPlain = (s = ""): TicketWin[] => {
    const dist = withDistrict(s);
    return dist.length > 0 ? dist : plain(s);
  };

  return {
    id: `${meta.code}-${meta.date}`,
    code: meta.code,
    name: meta.name,
    drawNo: meta.drawNo,
    date: meta.date,
    pdfUrl: meta.pdfUrl,
    verified: true,
    prizes: {
      first: parseFullOrPlain(seg.first),
      second: parseFullOrPlain(seg.second),
      third: parseFullOrPlain(seg.third),
      consolation: plain(seg.cons),
      fourth: isBumper ? parseFullOrPlain(seg.fourth) : fours(seg.fourth),
      fifth: isBumper ? parseFullOrPlain(seg.fifth) : fours(seg.fifth),
      sixth: fours(seg.sixth),
      seventh: fours(seg.seventh),
      eighth: fours(seg.eighth),
      ninth: fours(seg.ninth),
    },
  };
}

/** Reads the PDF's own header: "BHAGYATHARA LOTTERY NO.BT-78th DRAW held on:- 02/11/2026,3:00 PM" or "POOJA BUMPER LOTTERY NO. BR-112th DRAW held on:- 28/11/2026, 2:00 PM". */
export function identifyPdf(
  text: string,
): { code: string; no: string; date: string } | null {
  const m =
    text.match(
      /(?:LOTTERY\s*NO\.?|BUMPER\s*LOTTERY\s*NO\.?)\s*([A-Z]{2})\s*[-–]?\s*(\d{1,5})\s*(?:st|nd|rd|th)?\s*DRAW\s*held\s*on\s*:?-?\s*(\d{2})\/(\d{2})\/(\d{4})/i,
    ) ||
    text.match(
      /([A-Z]{2})\s*[-–]\s*(\d{1,5})\s*(?:st|nd|rd|th)?\s*DRAW\s*held\s*on\s*:?-?\s*(\d{2})\/(\d{2})\/(\d{4})/i,
    );
  return m
    ? { code: m[1].toUpperCase(), no: m[2], date: `${m[5]}-${m[4]}-${m[3]}` }
    : null;
}

const TICKET_RE = /^[A-Z]{2} \d{6}$/;
const FOUR_RE = /^\d{4}$/;
const DISTRICT_RE = /^[A-Z][A-Z .]{2,}$/i;

/**
 * Strict gate: returns a list of problems; an empty list means the draw is safe to store.
 * Anything partial, duplicated, mis-dated or oddly formatted is rejected, never "fixed up".
 */
export function validateDraw(d: Draw, now = new Date()): string[] {
  const e: string[] = [];
  const isBumper = isBumperDraw(d.code, d.drawNo);
  const lot = lotteryByCode(d.code);
  if (!lot) e.push(`unknown lottery code "${d.code}"`);
  else if (!isBumper && lot.weekday == null)
    e.push(`unknown weekly lottery code "${d.code}"`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.push(`bad date "${d.date}"`);
  else {
    const dt = new Date(d.date + "T00:00:00");
    if (isNaN(+dt)) e.push("unreadable date");
    else {
      if (!isBumper && lot?.weekday != null && dt.getDay() !== lot.weekday) {
        e.push(
          `${d.code} is drawn on weekday ${lot.weekday}, but ${d.date} is weekday ${dt.getDay()}`,
        );
      }
      if (d.date > isoDate(nowIST(now))) e.push("draw date is in the future");
    }
  }

  if (d.id !== `${d.code}-${d.date}`) e.push("id does not match code and date");
  const codePrefix = d.code.replace(/-\d+$/, "");
  if (!new RegExp(`^(?:${codePrefix}|[A-Z]{2})-\\d{1,5}$`).test(d.drawNo))
    e.push(`draw number "${d.drawNo}" should look like ${d.code}-76`);

  const p = d.prizes;
  const tickets = (
    tier: "first" | "second" | "third" | "consolation",
    min: number,
    max: number,
    needDistrict: boolean,
  ) => {
    const list = p[tier];
    if (list.length < min || list.length > max)
      e.push(
        `${tier}: expected ${min === max ? min : `${min}–${max}`} ticket(s), found ${list.length}`,
      );
    for (const w of list) {
      if (!TICKET_RE.test(w.ticket))
        e.push(`${tier}: invalid ticket "${w.ticket}"`);
      if (needDistrict && !(w.district && DISTRICT_RE.test(w.district)))
        e.push(`${tier}: missing/invalid district for ${w.ticket}`);
    }
    if (new Set(list.map((w) => w.ticket)).size !== list.length)
      e.push(`${tier}: duplicate tickets`);
  };
  tickets("first", 1, 1, true);
  tickets("second", 1, isBumper ? 10 : 1, isBumper ? false : true);
  tickets("third", 1, isBumper ? 20 : 12, isBumper ? false : true);
  tickets("consolation", 1, 30, false);

  // Integrity check: consolation tickets are the 1st-prize number in the other series.
  if (p.first[0] && p.consolation.length) {
    const n = p.first[0].ticket.slice(-6);
    for (const w of p.consolation)
      if (!w.ticket.endsWith(n))
        e.push(
          `consolation ${w.ticket} does not share the 1st-prize digits ${n}`,
        );
    const series = new Set([
      p.first[0].ticket.slice(0, 2),
      ...p.consolation.map((w) => w.ticket.slice(0, 2)),
    ]);
    if (series.size !== p.consolation.length + 1)
      e.push(
        "consolation series are duplicated or overlap the 1st-prize series",
      );
  }

  if (isBumper) {
    // In Bumper draws: 4th and 5th prizes use full ticket numbers (Series + 6 digits + optional Location)
    const checkBumperFullTicketTier = (
      tier: "fourth" | "fifth",
      min = 1,
      max = 50,
    ) => {
      const list = p[tier];
      if (list.length < min || list.length > max)
        e.push(
          `${tier}: expected ${min}–${max} ticket(s), found ${list.length}`,
        );
      for (const item of list) {
        const ticket = typeof item === "string" ? item : item?.ticket;
        if (!ticket || !TICKET_RE.test(ticket))
          e.push(`${tier}: invalid ticket "${ticket}"`);
      }
    };
    checkBumperFullTicketTier("fourth", 1, 50);
    checkBumperFullTicketTier("fifth", 1, 50);
  } else {
    // In Weekly draws: 4th and 5th prizes are 4-digit numbers
    const fours = (tier: "fourth" | "fifth", required: boolean) => {
      const list = p[tier] as string[];
      if (required && list.length < 1) e.push(`${tier}: no numbers found`);
      if (list.length > 400)
        e.push(`${tier}: implausible count ${list.length}`);
      for (const n of list)
        if (!FOUR_RE.test(n)) e.push(`${tier}: invalid number "${n}"`);
      if (new Set(list).size !== list.length)
        e.push(`${tier}: duplicate numbers`);
    };
    fours("fourth", true);
    fours("fifth", true);
  }

  // 6th through 9th are 4-digit numbers in both weekly and bumper draws
  // (allowing up to 1000 numbers in bumper draws like Pooja Bumper with 762 slots)
  const maxFours = isBumper ? 1000 : 400;
  const foursTier = (
    tier: "sixth" | "seventh" | "eighth" | "ninth",
    required: boolean,
  ) => {
    const list = p[tier];
    if (required && list.length < 1) e.push(`${tier}: no numbers found`);
    if (list.length > maxFours)
      e.push(`${tier}: implausible count ${list.length}`);
    for (const n of list)
      if (!FOUR_RE.test(n)) e.push(`${tier}: invalid number "${n}"`);
    if (new Set(list).size !== list.length)
      e.push(`${tier}: duplicate numbers`);
  };
  foursTier("sixth", true);
  foursTier("seventh", true);
  foursTier("eighth", true);
  foursTier("ninth", false);

  return e;
}

export const looksComplete = (d: Draw) => validateDraw(d).length === 0;
