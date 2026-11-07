export type Tier = "first" | "second" | "third" | "consolation" | "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth";

export interface TicketWin { ticket: string; district?: string }

export interface Draw {
  id: string;            // e.g. "BT-2026-11-06"
  code: string;          // lottery code, e.g. BT
  name: string;
  drawNo: string;        // e.g. "BT-12"
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
    fourth: string[]; fifth: string[]; sixth: string[]; seventh: string[]; eighth: string[]; ninth: string[];
  };
  amounts?: Partial<Record<Tier, number>>;
}

export interface ResultsPayload { draws: Draw[]; source: "supabase" | "demo"; updatedAt: string }
