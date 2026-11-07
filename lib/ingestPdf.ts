import { extractPdfText, fetchListing, identifyPdf, parseResultText, validateDraw, LOTIS_URL, type ListingRow } from "./scraper/lotisParser";
import { saveDraw } from "./store";
import { notifyNewDraw } from "./notify";
import { isoDate, nowIST } from "./schedule";
import type { Draw } from "./types";

export interface IngestResult { ok: boolean; message: string; draw?: Draw; problems?: string[]; mismatch?: string[] }

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** One strict path for every official PDF (CLI folder, /admin/upload, Telegram bot). */
export async function ingestPdfBuffer(buf: Buffer, opts: { rows?: ListingRow[]; dry?: boolean } = {}): Promise<IngestResult> {
  let text: string;
  try { text = await extractPdfText(buf); } catch { return { ok: false, message: "Could not read this file as a PDF." }; }
  const id = identifyPdf(text);
  if (!id) return { ok: false, message: "This does not look like an official LOTIS result PDF (no draw header found)." };

  let rows = opts.rows;
  if (!rows) { try { rows = await fetchListing(); } catch (e: any) { return { ok: false, message: `Could not reach LOTIS to cross-check the draw (${e.message}). Try again in a minute.` }; } }
  const row = rows.find((r) => r.drawNo === `${id.code}-${id.no}` && r.date === id.date);
  if (!row) return { ok: false, message: `${id.code}-${id.no} (${id.date}) is not on the LOTIS listing, so it was not saved.` };

  const draw = parseResultText(text, { code: row.code, name: title(row.name), drawNo: row.drawNo, date: row.date, pdfUrl: LOTIS_URL });
  const problems = validateDraw(draw);
  if (problems.length) return { ok: false, message: `${row.drawNo} REJECTED, nothing saved.`, problems, draw };
  if (opts.dry) return { ok: true, message: `${row.drawNo} passes validation (dry run, not saved).`, draw };

  const r = await saveDraw(draw, "official_pdf");
  let note = "";
  if (r.alert && row.date === isoDate(nowIST())) { const n = await notifyNewDraw(draw); note = ` Alerts: push ${n.push}, telegram ${n.telegram ? "sent" : "off"}.`; }
  const mm = r.mismatch.length ? ` ⚠️ The earlier unofficial result DIFFERED from the PDF (${r.mismatch.join("; ")}). The official PDF has replaced it.` : "";
  return { ok: true, draw, mismatch: r.mismatch, message: `✓ ${row.drawNo} (${row.date}) saved as VERIFIED. 1st ${draw.prizes.first[0].ticket} (${draw.prizes.first[0].district}).${note}${mm}` };
}
