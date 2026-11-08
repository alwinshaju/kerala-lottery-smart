export type Tier = "first" | "second" | "third" | "consolation" | "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth";

export interface TicketWin { ticket: string; district?: string }

export function isTicketWin(w: TicketWin | string | unknown): w is TicketWin {
  return typeof w === "object" && w !== null && typeof (w as any).ticket === "string";
}

export interface Draw {
  id: string;            // e.g. "BT-2026-11-06" or "BR-2026-11-28"
  code: string;          // lottery code, e.g. BT, BR
  name: string;
  drawNo: string;        // e.g. "BT-12", "BR-112"
  date: string;          // YYYY-MM-DD
  pdfUrl?: string;
  verified: boolean;     // parsed from official PDF
  source?: "official_pdf" | "consensus" | "feed"; // consensus/feed = unofficial, awaiting the official PDF
  updatedAt?: string;    // row version (ISO), used for CDN cache-busting
  prizes: {
    first: TicketWin[];
    second: TicketWin[];
    third: TicketWin[];
    consolation: TicketWin[];
    // In Bumper draws (BR-*), 4th & 5th prizes are full ticket numbers (TicketWin); in Weekly draws they are 4-digit strings
    fourth: (TicketWin | string)[];
    fifth: (TicketWin | string)[];
    sixth: string[];
    seventh: string[];
    eighth: string[];
    ninth: string[];
  };
  amounts?: Partial<Record<Tier, number>>;
}

export interface ResultsPayload { draws: Draw[]; source: "supabase" | "demo"; updatedAt: string }
