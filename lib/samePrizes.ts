import type { Draw } from "./types";

/** "KOZHIKODE" and "KOZHIKKODE" are the same place; ignore spacing and doubled letters. */
export const normDistrict = (d = "") => d.toUpperCase().replace(/[^A-Z]/g, "").replace(/(.)\1+/g, "$1");

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
    const x = [...a.prizes[t]].sort().join(","), y = [...b.prizes[t]].sort().join(",");
    if (x !== y) out.push(`${t}: ${a.prizes[t].length} vs ${b.prizes[t].length} numbers differ`);
  }
  return out;
}
