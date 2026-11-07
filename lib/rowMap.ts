import type { Draw } from "./types";

/** Maps a `draws` table row (also a Realtime `payload.new`) to a Draw. Returns null if the shape is invalid. */
export function rowToDraw(r: any): Draw | null {
  if (!r || typeof r.id !== "string" || typeof r.code !== "string" || typeof r.date !== "string" || !r.prizes?.first || !Array.isArray(r.prizes.consolation) || !Array.isArray(r.prizes.fourth)) return null;
  return {
    id: r.id, code: r.code, name: r.name, drawNo: r.draw_no, date: String(r.date).slice(0, 10), pdfUrl: r.pdf_url ?? undefined,
    verified: !!r.verified, source: r.source === "consensus" || r.source === "feed" ? r.source : "official_pdf", prizes: r.prizes, amounts: r.amounts ?? undefined, updatedAt: r.updated_at ?? undefined,
  };
}

