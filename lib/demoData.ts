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
  return draws;
}
export { WEEKLY };
