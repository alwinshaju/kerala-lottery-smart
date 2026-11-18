import type {
  Draw,
  OfficialCatalogEntry,
  ResultsPayload,
  Tier,
  TicketWin,
} from "../../../lib/types";
import { ALL_LOTTERIES, isoDate, nowIST } from "../../../lib/schedule";
import { parseResultText, validateDraw } from "../../../lib/resultText";
import { TIER_ORDER } from "../../../lib/ticket";
import { isBumperDraw } from "../../../lib/rowMap";
import { validDate } from "../domain";

export const RESULT_SOURCES = {
  official: {
    name: "Kerala State Lotteries · LOTIS",
    url: "https://www.lotteryagent.kerala.gov.in/result/public/",
  },
  api: {
    name: "India Lottery API",
    url: "https://indialotteryapi.com/kerala-lottery-api/",
    endpoint:
      "https://indialotteryapi.com/wp-json/klr/v1/history?limit=30&offset=0",
  },
  feed: {
    name: "KeralaLotteries.net",
    url: "https://www.keralalotteries.net/",
    endpoint:
      "https://www.keralalotteries.net/feeds/posts/default?alt=json&max-results=40",
  },
};
/** Official results published by the app owner after checking the PDF. */
export const OFFICIAL_UPLOADS_URL =
  "https://lottery-official.lottery-official-api.workers.dev/api/draws?limit=200";
export type CatalogEntry = OfficialCatalogEntry;
type JsonObject = Record<string, unknown>;
const object = (v: unknown): JsonObject =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : {};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const fullTicket = /^[A-Z]{2} \d{6}$/;
const four = /^\d{4}$/;
function recordSource(d: Draw, kind: "api" | "feed"): Draw {
  return {
    ...d,
    sourceRecords: {
      [kind]: {
        drawNo: d.drawNo,
        prizes: d.prizes,
        amounts: d.amounts,
        url: d.sources?.[0]?.url ?? RESULT_SOURCES[kind].url,
        fetchedAt: new Date().toISOString(),
      },
    },
  };
}

export function htmlText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v: string) => {
      const n =
        v[0].toLowerCase() === "x" ? parseInt(v.slice(1), 16) : Number(v);
      return n <= 0x10ffff ? String.fromCodePoint(n) : " ";
    })
    .replace(/[ \t]+/g, " ");
}

/** "STHREE-SAKTHI-10/11/2025 " -> "Sthree Sakthi" */
function catalogName(label: string) {
  return label
    .replace(/-?\d{2}\/\d{2}\/\d{4}\s*$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Read only the public draw catalogue. Never generate or follow CAPTCHA download URLs. */
export function parseOfficialCatalog(html: string): CatalogEntry[] {
  const rows: CatalogEntry[] = [];
  const re =
    /<td>\s*([^<]*?)\(([A-Z]{2})-(\d{1,5})\)\s*<\/td>\s*<td>\s*(\d{2})-(\d{2})-(\d{4})/g;
  for (const m of html.matchAll(re)) {
    const date = `${m[6]}-${m[5]}-${m[4]}`;
    if (validDate(date))
      rows.push({
        name: catalogName(m[1]),
        code: m[2],
        drawNo: `${m[2]}-${m[3]}`,
        date,
      });
  }
  return rows;
}

export function parseRupees(value: unknown): number | undefined {
  const s = str(value)
    .replace(/₹|Rs\.?|INR/gi, "")
    .replace(/\s/g, "")
    .replace(/\/-$/, "");
  if (!/^(?:\d+|\d{1,3}(?:[,.]\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})$/.test(s))
    return undefined;
  const n = Number(s.replace(/[,.]/g, ""));
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}
function normalizeTicket(v: unknown): TicketWin | null {
  const o = object(v);
  const t = (typeof v === "string" ? v : str(o.ticket))
    .toUpperCase()
    .trim()
    .replace(/^([A-Z]{2})\s*(\d{6})$/, "$1 $2");
  return fullTicket.test(t)
    ? {
        ticket: t,
        ...(str(o.location || o.district)
          ? { district: str(o.location || o.district) }
          : {}),
      }
    : null;
}
export function publicDrawErrors(d: Draw, now = new Date()): string[] {
  if (!validDate(d.date)) return ["Invalid draw date"];
  const errors = validateDraw(d, now).filter(
    (e) => !e.includes("missing/invalid district"),
  );
  if (d.date === isoDate(nowIST(now)) && nowIST(now).getHours() < 15)
    errors.push("Draw has not taken place yet");
  if (!isBumperDraw(d.code, d.drawNo)) {
    const expected = {
      fourth: 19,
      fifth: 6,
      sixth: 25,
      seventh: 76,
    } as const;
    if (d.date >= "2025-11-10") {
      for (const [tier, count] of Object.entries(expected))
        if (d.prizes[tier as Tier].length !== count)
          errors.push(`${tier}: incomplete weekly prize list`);
      // The eighth-prize list length varies by draw (seen 84–96), so only
      // reject lists that are clearly truncated.
      if (d.prizes.eighth.length < 80)
        errors.push("eighth: incomplete weekly prize list");
    }
    if (d.prizes.ninth.length < 100)
      errors.push("ninth: incomplete weekly prize list");
  }
  for (const tier of TIER_ORDER) {
    const values = d.prizes[tier].map((x) =>
      typeof x === "string" ? x : x.ticket,
    );
    if (new Set(values).size !== values.length)
      errors.push(`${tier}: duplicate numbers`);
  }
  for (const tier of TIER_ORDER)
    if (d.prizes[tier].length && !d.amounts?.[tier])
      errors.push(`${tier}: prize amount missing`);
  return errors;
}

export function parseApiDraw(value: unknown, now = new Date()): Draw | null {
  const row = object(value),
    p = object(row.prizes);
  const m = str(row.draw_code).match(/^([A-Z]{2})-(\d{1,5})$/);
  if (!m || !validDate(str(row.draw_date))) return null;
  const lot = ALL_LOTTERIES.find((l) => l.code === m[1]);
  if (!lot) return null;
  const first = normalizeTicket(row.first ?? row.first_ticket);
  if (!first) return null;
  const amounts: Draw["amounts"] = {};
  const map: Record<Tier, string> = {
    first: "1st",
    second: "2nd",
    third: "3rd",
    consolation: "consolation",
    fourth: "4th",
    fifth: "5th",
    sixth: "6th",
    seventh: "7th",
    eighth: "8th",
    ninth: "9th",
  };
  const prizes = {} as Draw["prizes"];
  for (const tier of TIER_ORDER) {
    const amount = parseRupees(object(p.amounts)[map[tier]]);
    if (amount) amounts[tier] = amount;
    if (tier === "first") {
      prizes.first = [first];
      continue;
    }
    const v = p[map[tier]];
    if (!Array.isArray(v)) return null;
    const full =
      ["second", "third", "consolation"].includes(tier) ||
      (isBumperDraw(lot.code, str(row.draw_code)) &&
        ["fourth", "fifth"].includes(tier));
    if (full) {
      const entries = v.map(normalizeTicket);
      if (entries.some((x) => !x)) return null;
      (prizes as unknown as Record<string, unknown>)[tier] = entries;
    } else {
      if (v.some((x) => typeof x !== "string" || !four.test(x))) return null;
      (prizes as unknown as Record<string, unknown>)[tier] = v;
    }
  }
  const d: Draw = {
    id: `${lot.code}-${row.draw_date}`,
    code: lot.code,
    name: isBumperDraw(lot.code, str(row.draw_code))
      ? str(row.draw_name).slice(0, 70) || lot.name
      : lot.name,
    drawNo: str(row.draw_code),
    date: str(row.draw_date),
    verified: false,
    source: "feed",
    sourceStatus: "single",
    amounts,
    prizes,
    sources: [{ name: RESULT_SOURCES.api.name, url: RESULT_SOURCES.api.url }],
  };
  return publicDrawErrors(d, now).length ? null : recordSource(d, "api");
}
export function parseApiHistory(value: unknown, now = new Date()): Draw[] {
  const items = object(value).items;
  if (!Array.isArray(items))
    throw new Error("Public API returned an invalid history response.");
  return items
    .map((v) => parseApiDraw(v, now))
    .filter((v): v is Draw => v !== null);
}

export function parseFeed(value: unknown, now = new Date()): Draw[] {
  const entries = object(object(value).feed).entry;
  if (!Array.isArray(entries))
    throw new Error("Public feed returned an invalid response.");
  const out = new Map<string, Draw>();
  for (const entry of entries) {
    const row = object(entry),
      title = str(object(row.title).$t);
    const date = title.match(/(\d{2})[-./](\d{2})[-./](\d{4})/);
    const code = title.match(/\b([A-Z]{2})[\s.\-]+(\d{1,5})\b/);
    if (!date || !code) continue;
    const lot = ALL_LOTTERIES.find((l) => l.code === code[1]);
    if (!lot) continue;
    const text = htmlText(str(object(row.content).$t));
    // Introductory articles sometimes list prize amounts before any winners. Only a full validated draw is accepted.
    const d = parseResultText(text, {
      code: lot.code,
      name: isBumperDraw(lot.code, `${lot.code}-${code[2]}`)
        ? /vishu/i.test(title)
          ? "Vishu Bumper"
          : /thiruvonam|onam/i.test(title)
            ? "Thiruvonam Bumper"
            : /summer/i.test(title)
              ? "Summer Bumper"
              : /monsoon/i.test(title)
                ? "Monsoon Bumper"
                : /christmas|x.mas|new.year/i.test(title)
                  ? "Christmas–New Year Bumper"
                  : lot.name
        : lot.name,
      drawNo: `${lot.code}-${code[2]}`,
      date: `${date[3]}-${date[2]}-${date[1]}`,
    });
    d.verified = false;
    d.source = "feed";
    d.sourceStatus = "single";
    d.amounts = {};
    const headers: Record<Tier, string> = {
      first: "1st",
      second: "2nd",
      third: "3rd",
      consolation: "(?:Cons(?:olation)?)",
      fourth: "4th",
      fifth: "5th",
      sixth: "6th",
      seventh: "7th",
      eighth: "8th",
      ninth: "9th",
    };
    for (const tier of TIER_ORDER) {
      const m = text.match(
        new RegExp(
          headers[tier] +
            "\\s*Prize\\s*[:\\-]?\\s*(?:Rs\\.?|₹)\\s*:?\\s*([\\d,.]+)\\s*\\/-",
          "i",
        ),
      );
      const amount = parseRupees(m?.[1]);
      if (amount) d.amounts[tier] = amount;
    }
    if (publicDrawErrors(d, now).length) continue;
    const link = Array.isArray(row.link)
      ? row.link.map(object).find((l) => l.rel === "alternate")
      : undefined;
    const url = str(link?.href);
    d.sources = [
      {
        name: RESULT_SOURCES.feed.name,
        url: url.startsWith(RESULT_SOURCES.feed.url)
          ? url
          : RESULT_SOURCES.feed.url,
      },
    ];
    if (!out.has(d.id)) out.set(d.id, recordSource(d, "feed"));
  }
  return [...out.values()];
}

const ticketOf = (x: TicketWin | string) =>
  typeof x === "string" ? x : x.ticket;
/** Combine two sources' copies of one draw. Numbers both sources list are
 * kept; numbers only one lists are left out and counted per tier. Amounts
 * are kept only where the sources agree (or only one gives a value). */
export function reconcile(a: Draw, b: Draw) {
  const prizes = { ...b.prizes } as Draw["prizes"];
  const disputed: Partial<Record<Tier, number>> = {};
  for (const tier of TIER_ORDER) {
    const inA = new Set(a.prizes[tier].map(ticketOf));
    const inB = new Set(b.prizes[tier].map(ticketOf));
    const kept = b.prizes[tier].filter((x) => inA.has(ticketOf(x)));
    const unsure =
      [...inA].filter((x) => !inB.has(x)).length +
      [...inB].filter((x) => !inA.has(x)).length;
    (prizes as Record<Tier, unknown[]>)[tier] = kept;
    if (unsure) disputed[tier] = Math.max(1, Math.ceil(unsure / 2));
  }
  const amounts: Draw["amounts"] = {};
  for (const tier of TIER_ORDER) {
    const x = a.amounts?.[tier],
      y = b.amounts?.[tier];
    if (x && y ? x === y : x || y) amounts[tier] = (x || y)!;
  }
  const numbersAgree = Object.keys(disputed).length === 0;
  return { prizes, amounts, disputed: numbersAgree ? undefined : disputed, numbersAgree };
}
export function sameNumbers(a: Draw, b: Draw) {
  if (!samePrizeNumbers(a, b)) return false;
  return TIER_ORDER.every(
    (tier) =>
      !a.amounts?.[tier] ||
      !b.amounts?.[tier] ||
      a.amounts[tier] === b.amounts[tier],
  );
}
export function samePrizeNumbers(a: Draw, b: Draw) {
  if (a.id !== b.id || a.drawNo !== b.drawNo) return false;
  for (const tier of TIER_ORDER) {
    const values = (d: Draw) =>
      d.prizes[tier]
        .map((x) => (typeof x === "string" ? x : x.ticket))
        .sort()
        .join("|");
    if (values(a) !== values(b)) return false;
  }
  return true;
}
export function combineSources(
  api: Draw[],
  feed: Draw[],
  catalog: CatalogEntry[],
  warnings: string[] = [],
): ResultsPayload {
  const map = new Map(api.map((d) => [d.id, { ...d }]));
  for (const d of feed) {
    const previous = map.get(d.id);
    if (!previous) {
      map.set(d.id, d);
      continue;
    }
    const sameDraw = previous.drawNo === d.drawNo;
    const r = reconcile(previous, d);
    const matches = sameDraw && r.numbersAgree;
    map.set(d.id, {
      ...d,
      prizes: sameDraw ? r.prizes : d.prizes,
      amounts: r.amounts,
      disputed: sameDraw ? r.disputed : undefined,
      sources: [...(previous.sources ?? []), ...(d.sources ?? [])],
      source: matches ? "consensus" : "feed",
      sourceStatus: matches ? "matched" : "conflict",
      numbersAgree: matches,
      sourceRecords: { ...previous.sourceRecords, ...d.sourceRecords },
      sourceNote: matches
        ? "All prize numbers match two public sources. Official PDF verification is pending."
        : "Public sources disagree. Ticket checking is paused for this draw.",
    });
  }
  for (const [id, d] of map) {
    const official = catalog.find(
      (c) => c.code === d.code && c.date === d.date,
    );
    if (official) map.set(id, { ...d, officialDrawNo: official.drawNo });
    if (official && official.drawNo !== d.drawNo)
      map.set(id, {
        ...d,
        officialDrawNo: official.drawNo,
        numbersAgree: false,
        sourceStatus: "conflict",
        sourceNote:
          "Draw identity does not match the official public catalogue.",
      });
  }
  return {
    draws: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)),
    source: "public",
    updatedAt: new Date().toISOString(),
    warnings,
    officialCatalog: [...catalog].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

interface ResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}
export type SourceFetch = (
  url: string,
  init?: RequestInit,
) => Promise<ResponseLike>;
const memory = new Map<string, { at: number; body: string }>();
async function get(
  url: string,
  ttl: number,
  fetcher: SourceFetch,
): Promise<string> {
  const cached = memory.get(url);
  if (cached && Date.now() - cached.at < ttl) return cached.body;
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json,text/html" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    if (body.length > 6000000) throw new Error("Response too large");
    memory.set(url, { at: Date.now(), body });
    return body;
  } finally {
    clearTimeout(timer);
  }
}
export async function fetchPublicResults(
  fetcher: SourceFetch = fetch,
  now = new Date(),
): Promise<ResultsPayload> {
  const tasks = await Promise.allSettled([
    get(RESULT_SOURCES.api.endpoint, 120000, fetcher).then((t) =>
      parseApiHistory(JSON.parse(t), now),
    ),
    get(RESULT_SOURCES.feed.endpoint, 600000, fetcher).then((t) =>
      parseFeed(JSON.parse(t), now),
    ),
    get(RESULT_SOURCES.official.url, 1800000, fetcher).then(
      parseOfficialCatalog,
    ),
    get(OFFICIAL_UPLOADS_URL, 60000, fetcher).then(parseUploads),
  ]);
  const uploads =
    tasks[3].status === "fulfilled" ? (tasks[3].value as Draw[]) : [];
  const api = tasks[0].status === "fulfilled" ? (tasks[0].value as Draw[]) : [];
  const feed =
    tasks[1].status === "fulfilled" ? (tasks[1].value as Draw[]) : [];
  const catalog =
    tasks[2].status === "fulfilled" ? (tasks[2].value as CatalogEntry[]) : [];
  if (!api.length && !feed.length)
    throw new Error(
      "No complete results could be loaded from the public sources. Please try again later.",
    );
  const names = [
    "Public results API",
    "Comparison feed",
    "Official draw catalogue",
  ];
  const warnings = tasks.flatMap((r, i) =>
    r.status === "rejected"
      ? [`${names[i]} is temporarily unavailable.`]
      : r.value.length === 0
        ? [`${names[i]} returned no complete records.`]
        : [],
  );
  const combined = combineSources(api, feed, catalog, warnings);
  return applyUploads(combined, uploads);
}

/** Reads draws from the owner's official-results API, keeping only complete ones. */
export function parseUploads(text: string, now = new Date()): Draw[] {
  const data = JSON.parse(text) as { draws?: Draw[] };
  return (data.draws ?? []).filter(
    (d) =>
      d &&
      typeof d.id === "string" &&
      d.prizes &&
      publicDrawErrors({ ...d, prizes: d.prizes }, now).length === 0,
  );
}
/** Official PDF numbers win. Record whether the public results already agreed. */
export function applyUploads(
  payload: ResultsPayload,
  uploads: Draw[],
): ResultsPayload {
  if (!uploads.length) return payload;
  const byId = new Map(payload.draws.map((d) => [d.id, d]));
  for (const o of uploads) {
    const auto = byId.get(o.id);
    const checked: Draw = {
      ...o,
      verified: true,
      source: "official_pdf",
      sourceStatus: "matched",
      numbersAgree: true,
      disputed: undefined,
      officialCheck: auto ? (samePrizeNumbers(auto, o) ? "matched" : "corrected") : undefined,
      sourceNote: "Checked against the official Kerala State Lotteries PDF.",
      sourceRecords: auto?.sourceRecords,
    };
    byId.set(o.id, checked);
  }
  return {
    ...payload,
    draws: [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function mergeResults(
  previous: ResultsPayload | null,
  next: ResultsPayload,
): ResultsPayload {
  const draws = new Map((previous?.draws ?? []).map((d) => [d.id, d]));
  for (const d of next.draws) {
    const old = draws.get(d.id);
    if (d.source === "official_pdf") {
      draws.set(d.id, { ...d, updatedAt: next.updatedAt });
      continue;
    }
    // Once an official PDF is published, later automatic fetches never replace it.
    if (old?.source === "official_pdf") continue;
    const records = { ...old?.sourceRecords, ...d.sourceRecords };
    const officialDrawNo = d.officialDrawNo ?? old?.officialDrawNo;
    let merged: Draw = {
      ...d,
      sourceRecords: records,
      officialDrawNo,
      updatedAt: next.updatedAt,
    };
    if (records.api && records.feed) {
      const a = { ...d, ...records.api },
        b = { ...d, ...records.feed };
      const r = reconcile(a, b);
      const sameDraw =
        a.drawNo === b.drawNo &&
        (!officialDrawNo || officialDrawNo === b.drawNo);
      const matched = sameDraw && r.numbersAgree;
      merged = {
        ...merged,
        prizes: sameDraw ? r.prizes : b.prizes,
        amounts: r.amounts,
        disputed: sameDraw ? r.disputed : undefined,
        drawNo: b.drawNo,
        numbersAgree: matched,
        source: matched ? "consensus" : "feed",
        sourceStatus: matched ? "matched" : "conflict",
        sources: [
          { name: RESULT_SOURCES.api.name, url: records.api.url },
          { name: RESULT_SOURCES.feed.name, url: records.feed.url },
        ],
        sourceNote: matched
          ? "All prize numbers match two public sources. Official verification is pending."
          : "Public sources disagree, or the official draw identity differs. Ticket checking is paused.",
      };
    } else if (
      (old?.sourceStatus === "conflict" && d.sourceStatus !== "matched") ||
      (officialDrawNo && officialDrawNo !== d.drawNo)
    ) {
      merged = {
        ...merged,
        sourceStatus: "conflict",
        sourceNote:
          "This draw previously had conflicting sources. Waiting for agreement before ticket checking.",
      };
    }
    draws.set(d.id, merged);
  }
  return {
    ...next,
    warnings: next.warnings ?? previous?.warnings,
    officialCatalog: next.officialCatalog?.length
      ? next.officialCatalog
      : previous?.officialCatalog,
    draws: [...draws.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
