import type { Draw, TicketWin } from "./types";
import { WEEKLY, lotteryForWeekday, isoDate, nowIST } from "./schedule";

export const DISTRICTS = [
  "THIRUVANANTHAPURAM", "KOLLAM", "PATHANAMTHITTA", "ALAPPUZHA", "KOTTAYAM", "IDUKKI", "ERNAKULAM",
  "THRISSUR", "PALAKKAD", "MALAPPURAM", "KOZHIKODE", "WAYANAD", "KANNUR", "KASARAGOD",
];
// weighted so the leaderboard is not flat (demo only)
const DW = [9, 6, 4, 6, 8, 3, 10, 11, 12, 6, 7, 2, 5, 2];
const SERIES = ["PA", "PB", "PC", "PD", "PE", "PF", "PG", "PH", "PJ", "PK", "PL", "PM"];
const HOT = ["0229", "0844", "1477", "3560", "6266"]; // seeded to recur so analytics have signal

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** SYNTHETIC results for development. Never present these as real draws. */
export function buildDemoDraws(days = 400, today = new Date()): Draw[] {
  const draws: Draw[] = [];
  // Today's 3:00 PM draw does not exist before ~3:30 PM IST, so don't invent it.
  const ist = nowIST(today);
  const todayPublished = ist.getHours() * 60 + ist.getMinutes() >= 15 * 60 + 30;
  for (let i = 0; i < days; i++) {
    if (i === 0 && !todayPublished) continue;
    const d = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate() - i);
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const r = mulberry(seed);
    const lot = lotteryForWeekday(d.getDay());
    const num6 = () => String(100000 + Math.floor(r() * 900000));
    const four = () => (r() < 0.07 ? HOT[Math.floor(r() * HOT.length)] : String(Math.floor(r() * 10000)).padStart(4, "0"));
    const district = () => {
      const tot = DW.reduce((a, b) => a + b, 0); let x = r() * tot;
      for (let k = 0; k < DW.length; k++) { x -= DW[k]; if (x <= 0) return DISTRICTS[k]; }
      return DISTRICTS[0];
    };
    const win = (withDistrict: boolean): TicketWin => ({
      ticket: `${SERIES[Math.floor(r() * SERIES.length)]} ${num6()}`,
      ...(withDistrict ? { district: district() } : {}),
    });
    const list4 = (n: number) => Array.from({ length: n }, four).sort();
    const drawNum = 100 + Math.floor((ist.getTime() - d.getTime()) / 86400000 / 7) * -1 + 400;
    draws.push({
      id: `${lot.code}-${isoDate(d)}`, code: lot.code, name: lot.name, drawNo: `${lot.code}-${drawNum}`,
      date: isoDate(d), verified: false,
      prizes: {
        first: [win(true)], second: [win(true)], third: [win(true)],
        consolation: Array.from({ length: 9 }, () => win(false)),
        fourth: list4(12), fifth: list4(12), sixth: list4(12), seventh: list4(12), eighth: list4(12), ninth: list4(12),
      },
    });
  }

  // Seed Historical Pooja Bumper 2025 (BR-106)
  draws.push({
    id: "BR-2025-12-03", code: "BR", name: "Pooja Bumper 2025", drawNo: "BR-106",
    date: "2025-12-03", verified: true,
    prizes: {
      first: [{ ticket: "JD 545542", district: "PALAKKAD" }],
      second: [
        { ticket: "JA 182736", district: "KOLLAM" },
        { ticket: "JB 293847", district: "THRISSUR" },
        { ticket: "JC 384950", district: "ERNAKULAM" },
        { ticket: "JD 475869", district: "KOZHIKODE" },
        { ticket: "JE 564738", district: "KANNUR" },
      ],
      third: [
        { ticket: "JA 675849", district: "WAYANAD" },
        { ticket: "JB 786950", district: "KOTTAYAM" },
        { ticket: "JC 897061", district: "MALAPPURAM" },
        { ticket: "JD 908172", district: "THIRUVANANTHAPURAM" },
        { ticket: "JE 129384", district: "ALAPPUZHA" },
      ],
      consolation: [
        { ticket: "JA 545542" },
        { ticket: "JB 545542" },
        { ticket: "JC 545542" },
        { ticket: "JE 545542" },
      ],
      fourth: [
        { ticket: "JA 345678", district: "PALAKKAD" },
        { ticket: "JB 456789", district: "THRISSUR" },
        { ticket: "JC 567890", district: "ERNAKULAM" },
        { ticket: "JD 678901", district: "KOLLAM" },
        { ticket: "JE 789012", district: "KASARAGOD" },
      ],
      fifth: [
        { ticket: "JA 890123", district: "ALAPPUZHA" },
        { ticket: "JB 901234", district: "KOTTAYAM" },
        { ticket: "JC 112233", district: "IDUKKI" },
        { ticket: "JD 223344", district: "PATHANAMTHITTA" },
        { ticket: "JE 334455", district: "MALAPPURAM" },
      ],
      sixth: ["0229", "0844", "1477", "3560", "6266"],
      seventh: ["1111", "2222", "3333", "4444", "5555"],
      eighth: ["6666", "7777", "8888", "9999", "0000"],
      ninth: ["1234", "2345", "3456", "4567", "5678"],
    },
    amounts: {
      first: 120000000, second: 10000000, third: 1000000, consolation: 100000,
      fourth: 300000, fifth: 200000, sixth: 5000, seventh: 1000, eighth: 500, ninth: 300,
    },
  });

  // Seed Historical Pooja Bumper 2024 (BR-100)
  draws.push({
    id: "BR-2024-12-04", code: "BR", name: "Pooja Bumper 2024", drawNo: "BR-100",
    date: "2024-12-04", verified: true,
    prizes: {
      first: [{ ticket: "JC 325526", district: "KAYAMKULAM" }],
      second: [
        { ticket: "JA 213243", district: "KANNUR" },
        { ticket: "JB 324354", district: "ERNAKULAM" },
        { ticket: "JC 435465", district: "THRISSUR" },
        { ticket: "JD 546576", district: "PALAKKAD" },
        { ticket: "JE 657687", district: "KOLLAM" },
      ],
      third: [
        { ticket: "JA 768798", district: "KOZHIKODE" },
        { ticket: "JB 879809", district: "WAYANAD" },
        { ticket: "JC 980910", district: "MALAPPURAM" },
        { ticket: "JD 192031", district: "THIRUVANANTHAPURAM" },
        { ticket: "JE 203142", district: "KASARAGOD" },
      ],
      consolation: [
        { ticket: "JA 325526" },
        { ticket: "JB 325526" },
        { ticket: "JD 325526" },
        { ticket: "JE 325526" },
      ],
      fourth: [
        { ticket: "JA 918273", district: "ALAPPUZHA" },
        { ticket: "JB 827364", district: "KOTTAYAM" },
        { ticket: "JC 736455", district: "IDUKKI" },
        { ticket: "JD 645546", district: "THRISSUR" },
        { ticket: "JE 554637", district: "PALAKKAD" },
      ],
      fifth: [
        { ticket: "JA 112233", district: "KOLLAM" },
        { ticket: "JB 223344", district: "ERNAKULAM" },
        { ticket: "JC 334455", district: "KANNUR" },
        { ticket: "JD 445566", district: "MALAPPURAM" },
        { ticket: "JE 556677", district: "PATHANAMTHITTA" },
      ],
      sixth: ["0229", "0844", "1477", "3560", "6266"],
      seventh: ["1010", "2020", "3030", "4040", "5050"],
      eighth: ["6060", "7070", "8080", "9090", "0101"],
      ninth: ["1357", "2468", "3579", "4680", "5791"],
    },
    amounts: {
      first: 120000000, second: 10000000, third: 1000000, consolation: 100000,
      fourth: 300000, fifth: 200000, sixth: 5000, seventh: 1000, eighth: 500, ninth: 300,
    },
  });

  return draws.sort((a, b) => (a.date > b.date ? -1 : 1));
}
export { WEEKLY };
