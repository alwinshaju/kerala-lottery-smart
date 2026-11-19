import * as cheerio from "cheerio";
import type { Draw } from "../types";
import { parseResultText } from "../resultText";
export {
  parseResultText,
  identifyPdf,
  validateDraw,
  looksComplete,
  isBumperDraw,
} from "../resultText";

export const LOTIS_URL =
  "https://www.lotteryagent.kerala.gov.in/result/public/";

export interface ListingRow {
  name: string;
  code: string;
  drawNo: string;
  date: string;
  itemId?: string;
  pdfUrl?: string;
}

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
      const r = await fetch(url, {
        headers: { "User-Agent": "KeralaLotteryHub/1.0 (+informational)" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) return await r.text();
      last = new Error(`HTTP ${r.status}`);
    } catch (e) {
      last = e;
    }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error(
    `LOTIS unreachable after ${tries} tries: ${(last as Error)?.message}`,
  );
}

export async function fetchListing(html?: string): Promise<ListingRow[]> {
  const body = html ?? (await fetchWithRetry(LOTIS_URL));
  const $ = cheerio.load(body);
  const rows: ListingRow[] = [];
  $("#example tbody tr, #example tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const label = $(tds[1]).text().trim();
    const m = label.match(
      /^(.*?)-\d{2}\/\d{2}\/\d{4}\s*\(([A-Z0-9]+)-(\d+)\)/i,
    );
    const dm = $(tds[2])
      .text()
      .trim()
      .match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!m || !dm) return;
    const a = $(tds[3]).find("a");
    const href = a.attr("href");
    rows.push({
      name: m[1].replace(/-/g, " ").trim(),
      code: m[2].toUpperCase(),
      drawNo: `${m[2].toUpperCase()}-${m[3]}`,
      date: `${dm[3]}-${dm[2]}-${dm[1]}`,
      itemId: a.attr("data-item-id"),
      pdfUrl:
        href && href !== "#" ? new URL(href, LOTIS_URL).toString() : undefined,
    });
  });
  return rows;
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy?.();
  }
}

export async function parsePdfBuffer(
  buf: Buffer,
  meta: Parameters<typeof parseResultText>[1],
): Promise<Draw> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const { text } = await parser.getText();
    return parseResultText(text, meta);
  } finally {
    await parser.destroy?.();
  }
}
