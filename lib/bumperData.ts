import { computePayout, inr } from "./payout";
import { digitSum, oddCount } from "./generator";

export interface BumperInfo {
  code: string;
  drawNo: string;
  name: string;
  ml: string;
  drawDate: string; // YYYY-MM-DD
  drawTime: string; // "2:00 PM IST"
  targetIso: string; // ISO with timezone
  ticketPrice: number;
  firstPrize: number;
  series: string[];
  totalTickets: number;
  totalFourDigitSlots: number;
}

export const POOJA_BUMPER_2026: BumperInfo = {
  code: "BR",
  drawNo: "BR-112",
  name: "Pooja Bumper 2026",
  ml: "പൂജ ബമ്പർ 2026",
  drawDate: "2026-11-28",
  drawTime: "2:00 PM IST",
  targetIso: "2026-11-28T14:00:00+05:30",
  ticketPrice: 300,
  firstPrize: 120000000, // ₹12 Crore
  series: ["JA", "JB", "JC", "JD", "JE"],
  totalTickets: 4500000, // 45 Lakh tickets
  totalFourDigitSlots: 762,
};

export interface PrizeTierInfo {
  tier: string;
  label: string;
  mlLabel: string;
  grossAmount: number;
  winnersCount: string;
  ticketType: "full" | "four";
  agentComm: number;
  tds: number;
  netPayout: number;
  details: string;
}

/**
 * Source: Kerala Gazette Extraordinary, G.O.(P) No.86/2026/TAXES dated 19 Sep 2026, S.R.O. No. 783/2026 (Pooja Bumper BR-112).
 * https://statelottery.kerala.gov.in/images/pdf/prize-structure/GO-BR-112.pdf
 * Agent commission is 10% of each prize (as printed in the Gazette); TDS 30% applies above ₹10,000 (Section 194B).
 * Surcharge/cess are not modelled. Always confirm with the Directorate.
 */
export const POOJA_BUMPER_SOURCE_URL = "https://statelottery.kerala.gov.in/images/pdf/prize-structure/GO-BR-112.pdf";

function tier(
  id: string, label: string, mlLabel: string, gross: number, winnersCount: string,
  ticketType: "full" | "four", details: string,
): PrizeTierInfo {
  const p = computePayout(gross, 0.1, 0.3);
  return { tier: id, label, mlLabel, grossAmount: gross, winnersCount, ticketType, agentComm: p.commission, tds: p.tds, netPayout: p.net, details };
}

export const POOJA_BUMPER_TIERS: PrizeTierInfo[] = [
  tier("first", "1st Prize", "ഒന്നാം സമ്മാനം", 120000000, "1 · common to all series", "full", "Series + 6 digits (one winner, common to all series)"),
  tier("consolation", "Consolation", "സമാശ്വാസ സമ്മാനം", 100000, "4 · other series", "full", "Same 6 digits as the 1st prize in the other 4 series"),
  tier("second", "2nd Prize", "രണ്ടാം സമ്മാനം", 5000000, "10 · 2 per series", "full", "Series + 6 digits, two winners in each series"),
  tier("third", "3rd Prize", "മൂന്നാം സമ്മാനം", 500000, "10 · 2 per series", "full", "Series + 6 digits, two winners in each series"),
  tier("fourth", "4th Prize", "നാലാം സമ്മാനം", 300000, "5 · 1 per series", "full", "Series + 6 digits, one winner in each series"),
  tier("fifth", "5th Prize", "അഞ്ചാം സമ്മാനം", 200000, "10 · 2 per series", "full", "Series + 6 digits, two winners in each series"),
  tier("sixth", "6th Prize", "ആറാം സമ്മാനം", 5000, "18 endings · up to 8,100 prizes", "four", "Last four digits drawn 18 times (matches in every series)"),
  tier("seventh", "7th Prize", "ഏഴാം സമ്മാനം", 1000, "144 endings · up to 64,800 prizes", "four", "Last four digits drawn 144 times"),
  tier("eighth", "8th Prize", "എട്ടാം സമ്മാനം", 500, "288 endings · up to 1,29,600 prizes", "four", "Last four digits drawn 288 times"),
  tier("ninth", "9th Prize", "ഒൻപതാം സമ്മാനം", 300, "312 endings · up to 1,40,400 prizes", "four", "Last four digits drawn 312 times (ticket-price refund)"),
];

// NOTE: the winners below were compiled by hand and are NOT verified against official results. Shown for interest only.
export interface HistoricalWinner {
  year: number;
  drawNo: string;
  drawDate: string;
  ticket: string;
  district: string;
  prizeAmount: string;
  agent?: string;
  digitSum: number;
  repeatedPairs: string[];
}

export const HISTORICAL_POOJA_WINNERS: HistoricalWinner[] = [
  {
    year: 2025,
    drawNo: "BR-106",
    drawDate: "2025-12-03",
    ticket: "JD 545542",
    district: "Palakkad",
    prizeAmount: "₹12 Crore",
    agent: "Babu (A-3482, Palakkad)",
    digitSum: 25,
    repeatedPairs: ["55", "44"],
  },
  {
    year: 2024,
    drawNo: "BR-100",
    drawDate: "2024-12-04",
    ticket: "JC 325526",
    district: "Kayamkulam (Alappuzha)",
    prizeAmount: "₹12 Crore",
    agent: "Santhosh (A-1984, Kayamkulam)",
    digitSum: 23,
    repeatedPairs: ["55", "22"],
  },
  {
    year: 2023,
    drawNo: "BR-94",
    drawDate: "2023-11-22",
    ticket: "JC 110395",
    district: "Kasaragod",
    prizeAmount: "₹12 Crore",
    agent: "Hosdurg Agency",
    digitSum: 19,
    repeatedPairs: ["11"],
  },
  {
    year: 2022,
    drawNo: "BR-88",
    drawDate: "2022-11-20",
    ticket: "RA 591801",
    district: "Malappuram",
    prizeAmount: "₹10 Crore",
    agent: "Chanthakkadu Agency",
    digitSum: 24,
    repeatedPairs: ["11"],
  },
  {
    year: 2021,
    drawNo: "BR-82",
    drawDate: "2021-11-21",
    ticket: "NA 772492",
    district: "Ernakulam",
    prizeAmount: "₹10 Crore",
    agent: "Aluva Agency",
    digitSum: 31,
    repeatedPairs: ["77", "22"],
  },
  {
    year: 2020,
    drawNo: "BR-76",
    drawDate: "2020-11-18",
    ticket: "NA 201804",
    district: "Palakkad",
    prizeAmount: "₹5 Crore",
    agent: "Palakkad Dist Agency",
    digitSum: 15,
    repeatedPairs: ["00"],
  },
  {
    year: 2019,
    drawNo: "BR-70",
    drawDate: "2019-11-20",
    ticket: "NA 177435",
    district: "Kozhikode",
    prizeAmount: "₹5 Crore",
    agent: "Kozhikode Town Agency",
    digitSum: 27,
    repeatedPairs: ["77"],
  },
  {
    year: 2018,
    drawNo: "BR-64",
    drawDate: "2018-11-30",
    ticket: "NA 695995",
    district: "Thrissur",
    prizeAmount: "₹5 Crore",
    agent: "Guruvayur Agency",
    digitSum: 43,
    repeatedPairs: ["99", "55"],
  },
];

export const TOP_POOJA_HOT_4 = ["0229", "0844", "1477", "3560", "6266"];

export interface GeneratedPoojaTicket {
  series: string;
  number: string;
  fullTicket: string;
  sum: number;
  odd: number;
  even: number;
  pairs: string[];
  hotEnding?: string;
}

export interface PoojaGenFilter {
  series?: string | "all"; // JA, JB, JC, JD, JE or all
  sumMin?: number; // default 24
  sumMax?: number; // default 29
  requireRepeatPair?: boolean; // default true
  useHotEndings?: boolean; // default true
  count?: number; // default 5
}

function findRepeatingPairs(num: string): string[] {
  const pairs: string[] = [];
  // Check adjacent pairs (e.g. 55 in 545542)
  for (let i = 0; i < num.length - 1; i++) {
    if (num[i] === num[i + 1]) {
      pairs.push(num[i] + num[i]);
    }
  }
  // If no adjacent pair, check non-adjacent repeated digits
  if (!pairs.length) {
    const counts: Record<string, number> = {};
    for (const c of num) counts[c] = (counts[c] || 0) + 1;
    for (const [digit, count] of Object.entries(counts)) {
      if (count >= 2) pairs.push(digit + digit);
    }
  }
  return [...new Set(pairs)];
}

const rnd = (n: number) => Math.floor(Math.random() * n);

/**
 * Pooja Bumper Smart Number Generator
 * Filters JA–JE 6-digit combinations by historical Pooja Bumper patterns:
 * - 6-digit sum between 24 and 29
 * - Repeating digit pairs (e.g. 55, 44, 22)
 * - Top all-time 4-digit endings (0229, 0844, 1477, 3560, 6266)
 */
export function generatePoojaPicks(filter: PoojaGenFilter = {}): GeneratedPoojaTicket[] {
  const {
    series = "all",
    sumMin = 24,
    sumMax = 29,
    requireRepeatPair = true,
    useHotEndings = true,
    count = 5,
  } = filter;

  const validSeriesList = series === "all" || !series ? POOJA_BUMPER_2026.series : [series];
  const hotList = useHotEndings ? TOP_POOJA_HOT_4 : [];
  const results = new Map<string, GeneratedPoojaTicket>();

  let guard = 0;
  while (results.size < count && guard++ < 300000) {
    let numStr = "";
    let hotEnding: string | undefined = undefined;

    // 60% chance to blend with a top hot 4-digit ending if enabled
    if (hotList.length && Math.random() < 0.65) {
      const h = hotList[rnd(hotList.length)];
      // choose 2-digit prefix 10-99
      const prefix = 10 + rnd(90);
      numStr = String(prefix) + h;
      hotEnding = h;
    } else {
      numStr = String(100000 + rnd(900000));
    }

    if (numStr.length !== 6) continue;

    const sum = digitSum(numStr);
    if (sum < sumMin || sum > sumMax) continue;

    const pairs = findRepeatingPairs(numStr);
    if (requireRepeatPair && pairs.length === 0) continue;

    const s = validSeriesList[rnd(validSeriesList.length)];
    const fullTicket = `${s} ${numStr}`;

    if (!results.has(fullTicket)) {
      const o = oddCount(numStr);
      results.set(fullTicket, {
        series: s,
        number: numStr,
        fullTicket,
        sum,
        odd: o,
        even: 6 - o,
        pairs,
        hotEnding,
      });
    }
  }

  return [...results.values()];
}

