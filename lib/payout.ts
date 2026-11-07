import type { Tier } from "./types";

/** Typical weekly-lottery prize amounts. The official PDF is authoritative; parsed draws carry their own amounts. */
export const TIER_AMOUNTS: Record<Tier, number> = {
  first: 10000000, second: 3000000, third: 500000, consolation: 5000,
  fourth: 5000, fifth: 2000, sixth: 1000, seventh: 500, eighth: 200, ninth: 100,
};

export const PRIZE_PRESETS = [
  { label: "₹1 Crore", value: 10000000 }, { label: "₹75 Lakh", value: 7500000 },
  { label: "₹30 Lakh", value: 3000000 }, { label: "₹10 Lakh", value: 1000000 },
  { label: "₹5 Lakh", value: 500000 }, { label: "₹1 Lakh", value: 100000 },
  { label: "₹50,000", value: 50000 }, { label: "₹5,000", value: 5000 },
  { label: "₹1,000", value: 1000 }, { label: "₹500", value: 500 },
];

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export interface Payout {
  gross: number; commissionRate: number; commission: number;
  tdsRate: number; tds: number; net: number; where: string; docs: string[];
}

/**
 * Assumptions (editable in the UI):
 *  - Agent commission 10% (12% option for bumper-style top prizes) on the gross prize.
 *  - TDS u/s 194B at 30% on the gross prize when it exceeds ₹10,000.
 * Surcharge/cess are not modelled; always confirm with the Directorate / a tax professional.
 */
export function computePayout(gross: number, commissionRate = 0.1, tdsRate = 0.3): Payout {
  const commission = gross * commissionRate;
  const tds = gross > 10000 ? gross * tdsRate : 0;
  const net = gross - commission - tds;
  let where = "Any authorised lottery shop / agent";
  if (gross > 100000) where = "Directorate of State Lotteries, Thiruvananthapuram (or via bank as notified)";
  else if (gross > 5000) where = "District Lottery Office or a bank / authorised agent";
  const docs = ["Original winning ticket (undamaged, signed on the back)"];
  if (gross > 500) docs.push("Government ID proof (Aadhaar / Voter ID / Passport)");
  if (gross > 5000) docs.push("Claim form, passport-size photographs, bank account details");
  if (gross > 10000) docs.push("PAN card (TDS applies; 20% higher TDS without PAN)");
  if (gross > 100000) docs.push("Gazette notification copy / ticket details, claim within 90 days of draw");
  return { gross, commissionRate, commission, tdsRate: gross > 10000 ? tdsRate : 0, tds, net, where, docs };
}
