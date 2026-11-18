import type { Draw, ResultsPayload } from "../../lib/types";
import { parseTicket, checkTicket } from "../../lib/ticket";

/** Extract candidates without guessing O/0 or inventing a missing series. */
export function extractTickets(raw: string): string[] {
  let text = raw.toUpperCase();
  try {
    text = decodeURIComponent(text);
  } catch {
    /* A raw barcode need not be a URI. */
  }
  const full = [
    ...text.matchAll(/\b([A-Z]{2})[\s:,-]*(\d(?:[ \t]*\d){5})(?!\d)/g),
  ].map((m) => `${m[1]} ${m[2].replace(/\s/g, "")}`);
  if (full.length) return [...new Set(full)];
  return [
    ...new Set([...text.matchAll(/(?<!\d)\d{6}(?!\d)/g)].map((m) => m[0])),
  ];
}

export function validatePayload(value: unknown): ResultsPayload {
  const p = value as ResultsPayload;
  if (
    !p ||
    !Array.isArray(p.draws) ||
    !["demo", "supabase", "public"].includes(p.source) ||
    typeof p.updatedAt !== "string"
  )
    throw new Error("A source returned an invalid results response.");
  for (const d of p.draws) {
    if (
      !d ||
      typeof d.id !== "string" ||
      typeof d.code !== "string" ||
      typeof d.name !== "string" ||
      typeof d.drawNo !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      typeof d.verified !== "boolean" ||
      !d.prizes
    )
      throw new Error("A source returned an invalid draw.");
    for (const tier of [
      "first",
      "second",
      "third",
      "consolation",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
      "eighth",
      "ninth",
    ] as const) {
      if (
        !Array.isArray(d.prizes[tier]) ||
        d.prizes[tier].some(
          (w) => typeof w !== "string" && (!w || typeof w.ticket !== "string"),
        )
      )
        throw new Error("Invalid prize list.");
    }
    for (const tier of ["first", "second", "third", "consolation"] as const)
      if (
        d.prizes[tier].some(
          (w) => typeof w !== "object" || !w || !parseTicket(w.ticket)?.full,
        )
      )
        throw new Error("Invalid full-ticket prize entry.");
    if (
      d.amounts &&
      Object.values(d.amounts).some(
        (v) => typeof v !== "number" || !Number.isFinite(v) || v < 0,
      )
    )
      throw new Error("Invalid prize amount.");
  }
  return {
    ...p,
    draws: [...p.draws].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function ticketOutcome(
  draw: Draw | undefined,
  ticket: string,
  demo = false,
) {
  const parsed = parseTicket(ticket);
  if (!parsed?.full) return { state: "incomplete", wins: [] } as const;
  if (!draw) return { state: "pending", wins: [] } as const;
  if (draw.sourceStatus === "conflict")
    return { state: "conflict", wins: [] } as const;
  const wins = checkTicket(draw, parsed);
  return {
    state: demo
      ? "sample"
      : !draw.verified
        ? "provisional"
        : wins.length
          ? "won"
          : "no-match",
    wins,
  } as const;
}

export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export const csvCell = (v: string | number) =>
  '"' +
  String(v)
    .replace(/^[=+@-]/, "'$&")
    .replace(/"/g, '""') +
  '"';
