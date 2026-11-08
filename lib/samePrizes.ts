import type { Draw, TicketWin } from "./types";
import { isTicketWin } from "./types";

/** "KOZHIKODE" and "KOZHIKKODE" are the same place; ignore spacing and doubled letters. */
export const normDistrict = (d = "") => d.toUpperCase().replace(/[^A-Z]/g, "").replace(/(.)\1+/g, "$1");

function serializeItem(item: TicketWin | string): string {
  if (isTicketWin(item)) {
    return `${item.ticket}|${normDistrict(item.district)}`;
  }
  return String(item);
}

/** Returns a list of differences between two draws' prizes (empty = identical). */
export function diffPrizes(a: Draw, b: Draw): string[] {
  const out: string[] = [];
  for (const t of ["first", "second", "third"] as const) {
    const x = a.prizes[t].map((w) => `${w.ticket}|${normDistrict(w.district)}`).sort().join(",");
    const y = b.prizes[t].map((w) => `${w.ticket}|${normDistrict(w.district)}`).sort().join(",");
    if (x !== y) out.push(`${t}: ${x || "∅"} ≠ ${y || "∅"}`);
  }
  const cx = a.prizes.consolation.map((w) => w.ticket).sort().join(","), cy = b.prizes.consolation.map((w) => w.ticket).sort().join(",");
  if (cx !== cy) out.push("consolation differs");
  for (const t of ["fourth", "fifth", "sixth", "seventh", "eighth", "ninth"] as const) {
    const listA = a.prizes[t] || [];
    const listB = b.prizes[t] || [];
    const x = listA.map(serializeItem).sort().join(",");
    const y = listB.map(serializeItem).sort().join(",");
    if (x !== y) out.push(`${t}: ${listA.length} vs ${listB.length} numbers differ`);
  }
  return out;
}
