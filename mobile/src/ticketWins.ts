import type { Draw } from "../../lib/types";
import { ordinal } from "../../lib/ticket";
import { inr } from "../../lib/payout";
import { ticketOutcome } from "./domain";

export interface SavedTicketLite {
  id: string;
  ticket: string;
  date: string;
  code: string;
}
export interface TicketWinAlert {
  key: string;
  ticket: string;
  drawId: string;
  title: string;
  body: string;
}

/** Saved tickets that win a verified draw and have not been announced yet.
 * Provisional or being-confirmed results never produce an alert. */
export function ticketWinAlerts(
  tickets: SavedTicketLite[],
  draws: Draw[],
  announced: ReadonlySet<string>,
): TicketWinAlert[] {
  const out: TicketWinAlert[] = [];
  for (const t of tickets) {
    const draw = draws.find((d) => d.date === t.date && d.code === t.code);
    if (!draw) continue;
    const key = `${t.id}|${draw.id}`;
    if (announced.has(key)) continue;
    const result = ticketOutcome(draw, t.ticket);
    if (result.state !== "won") continue;
    const best = [...result.wins].sort((a, b) => b.amount - a.amount)[0];
    out.push({
      key,
      ticket: t.ticket,
      drawId: draw.id,
      title: "Your ticket won a prize",
      body: `${t.ticket} · ${draw.name} ${draw.drawNo}: ${ordinal[best.tier]} prize, ${inr(best.amount)}. Keep your ticket safe and verify with the official Gazette.`,
    });
  }
  return out;
}
