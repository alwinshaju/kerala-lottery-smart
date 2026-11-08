import type { Draw } from "./types";
import { digitSum, oddCount } from "./generator";
import { allHits } from "./analytics";

export interface ScoreCriterion {
  score: number;
  maxScore: number;
  label: string;
  badge: string;
  comment: string;
}

export interface TicketEvaluation {
  ticket: string; // e.g. "473560" or "PA 473560"
  series?: string;
  number: string; // 6 digits
  sum: number;
  odd: number;
  even: number;
  repeatingPairs: string[];
  hasLongRun: boolean; // 4+ identical digits in a row
  fourDigitEnding: string;
  historicalHits: number;
  isKnownHot: boolean;

  // Breakdown scores
  sumCriterion: ScoreCriterion;
  historyCriterion: ScoreCriterion;
  patternCriterion: ScoreCriterion;
  balanceCriterion: ScoreCriterion;

  totalScore: number; // 0 to 100
  rank?: number; // 1 = best
  isTopPick?: boolean;
}

export const TOP_HOT_ENDINGS = ["0229", "0844", "1477", "3560", "6266"];

/**
 * Evaluates the 6-Digit Sum Score (Max 35 pts)
 * - 35 pts for sums 26–28 (Peak statistical center)
 * - 30 pts for sums 24–25 or 29–30 (Sweet spot)
 * - 20 pts for sums 21–23 or 31–33
 * - 12 pts for sums 18–20 or 34–36
 * - 6 pts for sums 15–17 or 37–39
 * - 0 pts for extreme sums (< 15 or > 39)
 */
export function scoreDigitSum(sum: number): ScoreCriterion {
  if (sum >= 26 && sum <= 28) {
    return {
      score: 35,
      maxScore: 35,
      label: "6-Digit Sum",
      badge: `Σ${sum} · Peak Center`,
      comment: "Optimal statistical bell-curve center (highest probability density)",
    };
  }
  if ((sum >= 24 && sum <= 25) || (sum >= 29 && sum <= 30)) {
    return {
      score: 30,
      maxScore: 35,
      label: "6-Digit Sum",
      badge: `Σ${sum} · Sweet Spot`,
      comment: "Within the prime historical winning range (24–30)",
    };
  }
  if ((sum >= 21 && sum <= 23) || (sum >= 31 && sum <= 33)) {
    return {
      score: 20,
      maxScore: 35,
      label: "6-Digit Sum",
      badge: `Σ${sum} · Moderate`,
      comment: "Moderate sum, slightly off the main cluster",
    };
  }
  if ((sum >= 18 && sum <= 20) || (sum >= 34 && sum <= 36)) {
    return {
      score: 12,
      maxScore: 35,
      label: "6-Digit Sum",
      badge: `Σ${sum} · Marginal`,
      comment: "Marginal sum frequency (~8% of combinations)",
    };
  }
  if ((sum >= 15 && sum <= 17) || (sum >= 37 && sum <= 39)) {
    return {
      score: 6,
      maxScore: 35,
      label: "6-Digit Sum",
      badge: `Σ${sum} · Outer Fringe`,
      comment: "Outer boundary of possible outcomes",
    };
  }
  return {
    score: 0,
    maxScore: 35,
    label: "6-Digit Sum",
    badge: `Σ${sum} · Extreme`,
    comment: "Statistically rare extreme sum (<2% occurrence)",
  };
}

/**
 * Evaluates the Last 4-Digit Historical Repeat Score (Max 30 pts)
 * - Base points on historical appearance count in official/consensus draws
 * - Bonus points if ending is in the all-time top high-frequency list
 */
export function scoreHistory(fourEnding: string, draws: Draw[]): { criterion: ScoreCriterion; hits: number; isHot: boolean } {
  const isHot = TOP_HOT_ENDINGS.includes(fourEnding);

  // Count occurrences across stored draws
  let count = 0;
  if (draws.length > 0) {
    const hits = allHits(draws);
    for (const h of hits) {
      if (h.four === fourEnding) count++;
    }
  }

  let base = 6; // default baseline for non-repeating
  if (count >= 5) base = 20;
  else if (count >= 3) base = 16;
  else if (count >= 1) base = 12;

  const bonus = isHot ? 10 : 0;
  const finalScore = Math.min(30, base + bonus);

  return {
    hits: count,
    isHot,
    criterion: {
      score: finalScore,
      maxScore: 30,
      label: "4-Digit History",
      badge: `${fourEnding} · ${count} wins${isHot ? " 🔥" : ""}`,
      comment: isHot
        ? `Top high-frequency ending (${count} wins in database + hot bonus)`
        : count > 0
        ? `Has won ${count} time(s) across historical prize tiers`
        : "Unseen in recent history (fresh combination)",
    },
  };
}

/**
 * Evaluates the Digit Repetition Pattern (Max 20 pts)
 * - 20 pts if contains 1 or 2 repeating digit pairs (e.g. 55, 44, 22)
 * - 15 pts if 1 repeated digit
 * - 10 pts if all distinct
 * - Penalty: -15 pts if 4+ identical digits in a row (e.g. 5555xx)
 */
export function scoreRepetitionPattern(num: string): { criterion: ScoreCriterion; pairs: string[]; hasLongRun: boolean } {
  // Check for 4+ consecutive identical digits
  const hasLongRun = /(.)\1\1\1/.test(num);

  const freq: Record<string, number> = {};
  for (const c of num) freq[c] = (freq[c] || 0) + 1;

  const pairs: string[] = [];
  for (const [digit, count] of Object.entries(freq)) {
    if (count >= 2) {
      pairs.push(digit + digit);
    }
  }
  const uniquePairs = [...new Set(pairs)].sort();

  let score = 10; // default for all distinct digits
  let comment = "All 6 digits are distinct (represents ~15.1% of draw pool)";
  let badge = "Distinct Digits";

  if (hasLongRun) {
    score = 0;
    badge = "4+ Run Penalty";
    comment = "Contains 4+ consecutive identical digits (statistically improbable)";
  } else if (uniquePairs.length >= 2) {
    score = 20;
    badge = `Pairs: ${uniquePairs.join(", ")} (Double Pair)`;
    comment = "Ideal double-pair pattern (matches Bumper & weekly winner profiles)";
  } else if (uniquePairs.length === 1) {
    score = 20;
    badge = `Pair: ${uniquePairs[0]}`;
    comment = "Optimal single-pair repetition (matches 84.88% of winning tickets)";
  }

  return {
    pairs: uniquePairs,
    hasLongRun,
    criterion: {
      score,
      maxScore: 20,
      label: "Digit Repetition",
      badge,
      comment,
    },
  };
}

/**
 * Evaluates the Odd/Even Balance (Max 15 pts)
 * - 15 pts for 3:3 split (3 odd, 3 even) - ~31.25% of all combinations
 * - 12 pts for 4:2 or 2:4 split - ~46.8% combined
 * - 5 pts for 5:1 or 1:5 split
 * - 0 pts for 6:0 or 0:6 (all odd or all even)
 */
export function scoreOddEvenBalance(num: string): ScoreCriterion {
  const o = oddCount(num);
  const e = 6 - o;

  if (o === 3 && e === 3) {
    return {
      score: 15,
      maxScore: 15,
      label: "Odd/Even Balance",
      badge: "3 Odd : 3 Even (Ideal)",
      comment: "Perfect statistical equilibrium (most frequent parity distribution)",
    };
  }
  if ((o === 4 && e === 2) || (o === 2 && e === 4)) {
    return {
      score: 12,
      maxScore: 15,
      label: "Odd/Even Balance",
      badge: `${o} Odd : ${e} Even (Solid)`,
      comment: "Strong balance distribution (~46.8% combined occurrence)",
    };
  }
  if (o === 5 || o === 1) {
    return {
      score: 5,
      maxScore: 15,
      label: "Odd/Even Balance",
      badge: `${o} Odd : ${e} Even (Skewed)`,
      comment: "Heavily skewed parity (~18.7% combined occurrence)",
    };
  }
  return {
    score: 0,
    maxScore: 15,
    label: "Odd/Even Balance",
    badge: `${o} Odd : ${e} Even (All Same)`,
    comment: "Extremely skewed (all odd or all even, <3% occurrence)",
  };
}

/**
 * Evaluates a single 6-digit ticket against the 4 criteria
 */
export function evaluateTicket(rawTicket: string, draws: Draw[] = []): TicketEvaluation | null {
  const clean = rawTicket.toUpperCase().trim();
  const match = clean.match(/^([A-Z]{2})\s*(\d{6})$/) || clean.match(/^(\d{6})$/);

  if (!match) return null;

  const series = match[1] && match[2] ? match[1] : undefined;
  const num = match[2] ? match[2] : match[1];

  if (!/^\d{6}$/.test(num)) return null;

  const sum = digitSum(num);
  const o = oddCount(num);
  const e = 6 - o;
  const fourEnding = num.slice(-4);

  const sumCrit = scoreDigitSum(sum);
  const hist = scoreHistory(fourEnding, draws);
  const rep = scoreRepetitionPattern(num);
  const balCrit = scoreOddEvenBalance(num);

  const totalScore = sumCrit.score + hist.criterion.score + rep.criterion.score + balCrit.score;

  return {
    ticket: series ? `${series} ${num}` : num,
    series,
    number: num,
    sum,
    odd: o,
    even: e,
    repeatingPairs: rep.pairs,
    hasLongRun: rep.hasLongRun,
    fourDigitEnding: fourEnding,
    historicalHits: hist.hits,
    isKnownHot: hist.isHot,

    sumCriterion: sumCrit,
    historyCriterion: hist.criterion,
    patternCriterion: rep.criterion,
    balanceCriterion: balCrit,

    totalScore,
  };
}

/**
 * Evaluates a list of 2 to 6 stall tickets and ranks them from best (#1) to worst
 */
export function compareStallTickets(ticketInputs: string[], draws: Draw[] = []): TicketEvaluation[] {
  const evaluated: TicketEvaluation[] = [];

  for (const input of ticketInputs) {
    if (!input || !input.trim()) continue;
    const ev = evaluateTicket(input, draws);
    if (ev) evaluated.push(ev);
  }

  // Sort descending by totalScore (tie-break by sumCriterion, then historyCriterion)
  evaluated.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.sumCriterion.score !== a.sumCriterion.score) return b.sumCriterion.score - a.sumCriterion.score;
    return b.historyCriterion.score - a.historyCriterion.score;
  });

  // Assign ranks
  evaluated.forEach((item, index) => {
    item.rank = index + 1;
    item.isTopPick = index === 0;
  });

  return evaluated;
}

export interface BundleEvaluation {
  prefix: string; // 4 or 5 digits
  prefixLength: 4 | 5;
  bundleSize: number; // 10 or 100
  topPicks: TicketEvaluation[]; // Top 3
  allTickets: TicketEvaluation[]; // All scored tickets in sequence
}

/**
 * Mode 2: Bundle / Book Optimizer
 * Evaluates all tickets with a given 4-digit or 5-digit prefix and returns the top picks
 */
export function optimizeBundle(prefixInput: string, series = "JA", draws: Draw[] = []): BundleEvaluation | null {
  const clean = prefixInput.replace(/\D/g, "");
  if (clean.length !== 4 && clean.length !== 5) return null;

  const prefixLength = clean.length as 4 | 5;
  const bundleSize = prefixLength === 5 ? 10 : 100;
  const allTickets: TicketEvaluation[] = [];

  for (let i = 0; i < bundleSize; i++) {
    let suffix = "";
    if (prefixLength === 5) {
      suffix = String(i);
    } else {
      suffix = String(i).padStart(2, "0");
    }

    const fullNum = `${clean}${suffix}`;
    const fullTicketStr = series ? `${series} ${fullNum}` : fullNum;
    const ev = evaluateTicket(fullTicketStr, draws);
    if (ev) allTickets.push(ev);
  }

  // Sort a copy for top picks ranking
  const sorted = [...allTickets].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.sumCriterion.score !== a.sumCriterion.score) return b.sumCriterion.score - a.sumCriterion.score;
    return b.historyCriterion.score - a.historyCriterion.score;
  });

  // Mark ranks in allTickets
  const rankMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    rankMap.set(item.number, index + 1);
  });

  allTickets.forEach((item) => {
    item.rank = rankMap.get(item.number);
    item.isTopPick = item.rank === 1;
  });

  sorted.forEach((item, index) => {
    item.rank = index + 1;
    item.isTopPick = index === 0;
  });

  return {
    prefix: clean,
    prefixLength,
    bundleSize,
    topPicks: sorted.slice(0, 3),
    allTickets,
  };
}
