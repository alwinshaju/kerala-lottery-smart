export interface LotteryDef { code: string; name: string; ml: string; weekday: number | null; bumper?: boolean }

// weekday: 0 = Sunday
export const WEEKLY: LotteryDef[] = [
  { code: "SM", name: "Samrudhi", ml: "സമൃദ്ധി", weekday: 0 },
  { code: "BT", name: "Bhagyathara", ml: "ഭാഗ്യതാര", weekday: 1 },
  { code: "SS", name: "Sthree Sakthi", ml: "സ്ത്രീ ശക്തി", weekday: 2 },
  { code: "DL", name: "Dhanalekshmi", ml: "ധനലക്ഷ്മി", weekday: 3 },
  { code: "KN", name: "Karunya Plus", ml: "കാരുണ്യ പ്ലസ്", weekday: 4 },
  { code: "SK", name: "Suvarna Keralam", ml: "സുവർണ കേരളം", weekday: 5 },
  { code: "KR", name: "Karunya", ml: "കാരുണ്യ", weekday: 6 },
];

export const BUMPERS: LotteryDef[] = [
  { code: "TB", name: "Thiruvonam Bumper", ml: "തിരുവോണം ബമ്പർ", weekday: null, bumper: true },
  { code: "BR", name: "Pooja Bumper", ml: "പൂജ ബമ്പർ", weekday: null, bumper: true },
  { code: "XB", name: "X'mas-New Year Bumper", ml: "ക്രിസ്മസ്-ന്യൂ ഇയർ ബമ്പർ", weekday: null, bumper: true },
  { code: "SB", name: "Summer Bumper", ml: "സമ്മർ ബമ്പർ", weekday: null, bumper: true },
  { code: "VB", name: "Vishu Bumper", ml: "വിഷു ബമ്പർ", weekday: null, bumper: true },
  { code: "MB", name: "Monsoon Bumper", ml: "മൺസൂൺ ബമ്പർ", weekday: null, bumper: true },
];

export const ALL_LOTTERIES = [...WEEKLY, ...BUMPERS];

export const lotteryByCode = (code: string) => ALL_LOTTERIES.find((l) => l.code === code);
export const lotteryForWeekday = (d: number) => WEEKLY.find((l) => l.weekday === d)!;

/** Current time in IST regardless of device time zone. */
export function nowIST(now = new Date()) {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return ist;
}
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** True from 3:00 PM IST onward: the draw has happened, the official PDF usually follows around 4:20 PM. */
export function afterDrawTime(now = new Date()) {
  const t = nowIST(now);
  return t.getHours() * 60 + t.getMinutes() >= 15 * 60;
}
/** Past ~4:25 PM IST with no PDF yet = running late. */
export function pdfOverdue(now = new Date()) {
  const t = nowIST(now);
  return t.getHours() * 60 + t.getMinutes() >= 16 * 60 + 25;
}
