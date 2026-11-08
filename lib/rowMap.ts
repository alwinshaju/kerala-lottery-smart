import type { Draw, TicketWin } from "./types";

/** Detects whether a draw is a Bumper lottery draw (e.g. BR-112, BR, TB, etc.) */
export function isBumperDraw(code?: string, drawNo?: string): boolean {
  const c = String(code || "").toUpperCase();
  const d = String(drawNo || "").toUpperCase();
  return c.startsWith("BR-") || c === "BR" || d.startsWith("BR-") || c.endsWith("B") || d.includes("BUMPER");
}

function normalizeTicketWin(item: any): TicketWin {
  if (typeof item === "object" && item !== null && typeof item.ticket === "string") {
    return {
      ticket: item.ticket.trim(),
      ...(item.district ? { district: String(item.district).trim() } : {}),
    };
  }
  return { ticket: String(item ?? "").trim() };
}

function normalizeTicketOrFour(item: any): TicketWin | string {
  if (typeof item === "object" && item !== null && typeof item.ticket === "string") {
    return {
      ticket: item.ticket.trim(),
      ...(item.district ? { district: String(item.district).trim() } : {}),
    };
  }
  const s = String(item ?? "").trim();
  // If in a bumper lottery the ticket was stored as string like "JA 123456"
  if (/^[A-Z]{2}\s\d{6}$/.test(s)) {
    return { ticket: s };
  }
  return s;
}

/** Maps a `draws` table row (also a Realtime `payload.new`) to a Draw. Returns null if the shape is invalid. */
export function rowToDraw(r: any): Draw | null {
  if (!r || typeof r.id !== "string" || typeof r.code !== "string" || typeof r.date !== "string" || !r.prizes?.first || !Array.isArray(r.prizes.consolation) || !Array.isArray(r.prizes.fourth)) return null;

  const isBumper = isBumperDraw(r.code, r.draw_no);
  const p = r.prizes;

  const mapWinList = (list: any): TicketWin[] => Array.isArray(list) ? list.map(normalizeTicketWin) : [];
  const mapTierList = (list: any): (TicketWin | string)[] => Array.isArray(list) ? list.map(normalizeTicketOrFour) : [];
  const mapStrList = (list: any): string[] => Array.isArray(list) ? list.map((x) => String(x ?? "").trim()).filter(Boolean) : [];

  return {
    id: r.id,
    code: r.code,
    name: r.name,
    drawNo: r.draw_no,
    date: String(r.date).slice(0, 10),
    pdfUrl: r.pdf_url ?? undefined,
    verified: !!r.verified,
    source: r.source === "consensus" || r.source === "feed" ? r.source : "official_pdf",
    prizes: {
      first: mapWinList(p.first),
      second: mapWinList(p.second),
      third: mapWinList(p.third),
      consolation: mapWinList(p.consolation),
      fourth: isBumper ? mapTierList(p.fourth) : mapStrList(p.fourth),
      fifth: isBumper ? mapTierList(p.fifth) : mapStrList(p.fifth),
      sixth: mapStrList(p.sixth),
      seventh: mapStrList(p.seventh),
      eighth: mapStrList(p.eighth),
      ninth: mapStrList(p.ninth),
    },
    amounts: r.amounts ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}
