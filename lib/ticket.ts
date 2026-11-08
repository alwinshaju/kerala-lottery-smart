import type { Draw, Tier, TicketWin } from "./types";
import { TIER_AMOUNTS } from "./payout";
import { isTicketWin } from "./types";

export interface ParsedTicket { series?: string; number: string; full: boolean }

export function parseTicket(input: string): ParsedTicket | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = s.match(/^([A-Z]{2})(\d{6})$/);
  if (m) return { series: m[1], number: m[2], full: true };
  if (/^\d{6}$/.test(s)) return { number: s, full: false };
  if (/^\d{4}$/.test(s)) return { number: s, full: false };
  return null;
}

export interface Win { tier: Tier; amount: number; ticket: string }

export const TIER_ORDER: Tier[] = ["first", "second", "third", "consolation", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
export const ordinal: Record<Tier, string> = {
  first: "1st", second: "2nd", third: "3rd", consolation: "Consolation",
  fourth: "4th", fifth: "5th", sixth: "6th", seventh: "7th", eighth: "8th", ninth: "9th",
};

export function checkTicket(draw: Draw, t: ParsedTicket): Win[] {
  const wins: Win[] = [];
  const amt = (tier: Tier) => draw.amounts?.[tier] ?? TIER_AMOUNTS[tier];
  const last4 = t.number.slice(-4);

  // 1st through 3rd and consolation (always full ticket numbers with series)
  for (const tier of ["first", "second", "third", "consolation"] as const) {
    for (const w of draw.prizes[tier]) {
      const wl = w.ticket.replace(/\s/g, "");
      if (t.full && wl === `${t.series}${t.number}`) wins.push({ tier, amount: amt(tier), ticket: w.ticket });
      else if (!t.full && wl.endsWith(t.number)) wins.push({ tier, amount: amt(tier), ticket: w.ticket });
    }
  }

  // 4th and 5th: in Bumper lotteries these are full tickets; in weekly lotteries they are 4-digit endings
  for (const tier of ["fourth", "fifth"] as const) {
    for (const item of draw.prizes[tier]) {
      if (isTicketWin(item)) {
        const wl = item.ticket.replace(/\s/g, "");
        if (t.full && wl === `${t.series}${t.number}`) wins.push({ tier, amount: amt(tier), ticket: item.ticket });
        else if (!t.full && wl.endsWith(t.number)) wins.push({ tier, amount: amt(tier), ticket: item.ticket });
      } else if (typeof item === "string") {
        if (/^[A-Z]{2}\s?\d{6}$/.test(item)) {
          const wl = item.replace(/\s/g, "");
          if (t.full && wl === `${t.series}${t.number}`) wins.push({ tier, amount: amt(tier), ticket: item });
          else if (!t.full && wl.endsWith(t.number)) wins.push({ tier, amount: amt(tier), ticket: item });
        } else if (item === last4) {
          wins.push({ tier, amount: amt(tier), ticket: last4 });
        }
      }
    }
  }

  // 6th through 9th: always 4-digit endings
  for (const tier of ["sixth", "seventh", "eighth", "ninth"] as const) {
    if (draw.prizes[tier]?.includes(last4)) wins.push({ tier, amount: amt(tier), ticket: last4 });
  }

  return wins;
}

export function expandBundle(series: string, from: number, to: number, max = 100): string[] {
  const out: string[] = [];
  for (let n = Math.min(from, to); n <= Math.max(from, to) && out.length < max; n++) out.push(`${series} ${String(n).padStart(6, "0")}`);
  return out;
}
