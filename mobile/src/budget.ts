/** Spending-limit helpers for the "Lottery budget" card. Pure, so they can be tested. */
export interface SpendRow {
  date: string;
  spent: number;
}

export type BudgetState = "none" | "ok" | "near" | "reached";

export function spentOn(rows: SpendRow[], prefix: string) {
  return rows
    .filter((r) => r.date.startsWith(prefix))
    .reduce((sum, r) => sum + r.spent, 0);
}

/** "none" when no limit is set, "near" from 80% of the limit, "reached" at 100%. */
export function budgetState(spent: number, limit: number): BudgetState {
  if (!(limit > 0)) return "none";
  if (spent >= limit) return "reached";
  return spent >= limit * 0.8 ? "near" : "ok";
}

/** A warning to show before saving, or null when the spend stays within every limit. */
export function overspendWarning(
  rows: SpendRow[],
  today: string,
  amount: number,
  monthlyLimit: number,
  dailyLimit: number,
): string | null {
  const month = spentOn(rows, today.slice(0, 7)) + amount;
  const day = spentOn(rows, today) + amount;
  const over: string[] = [];
  if (dailyLimit > 0 && day > dailyLimit) over.push("daily limit");
  if (monthlyLimit > 0 && month > monthlyLimit) over.push("monthly budget");
  return over.length ? `This goes over your ${over.join(" and ")}.` : null;
}

/** Days from `today` to the end of the month, counting today. */
export function daysLeftInMonth(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(y, m, 0).getDate() - d + 1;
}
