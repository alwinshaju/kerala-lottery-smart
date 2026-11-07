export const digitSum = (s: string) => [...s].reduce((a, c) => a + Number(c), 0);
export const oddCount = (s: string) => [...s].filter((c) => Number(c) % 2 === 1).length;
export const hasRepeat = (s: string) => new Set(s).size < s.length;

export interface GenOptions {
  sumMin: number; sumMax: number;
  balances: ("3:3" | "4:2" | "2:4" | "any")[];
  requireRepeat: boolean;
  count: number;
  hot4?: string[];
}

export function analyse(n: string) {
  const sum = digitSum(n), odd = oddCount(n);
  return { sum, odd, even: n.length - odd, repeat: hasRepeat(n), inSweetSpot: sum >= 25 && sum <= 30 };
}

function balanceOk(n: string, balances: GenOptions["balances"]) {
  if (balances.includes("any")) return true;
  const o = oddCount(n);
  return balances.some((b) => (b === "3:3" && o === 3) || (b === "4:2" && o === 4) || (b === "2:4" && o === 2));
}

export function matches(n: string, o: GenOptions) {
  const s = digitSum(n);
  return s >= o.sumMin && s <= o.sumMax && balanceOk(n, o.balances) && (!o.requireRepeat || hasRepeat(n));
}

/** Enumerate the 900,000-number pool once and report how many pass the filters. */
export function poolStats(o: GenOptions) {
  let pass = 0;
  for (let i = 100000; i <= 999999; i++) if (matches(String(i), o)) pass++;
  return { pass, total: 900000, pct: (pass / 900000) * 100 };
}

const rnd = (n: number) => Math.floor(Math.random() * n);

export function generate(o: GenOptions): string[] {
  const out = new Set<string>();
  const hot = (o.hot4 ?? []).filter((h) => /^\d{4}$/.test(h));
  let guard = 0;
  while (out.size < o.count && guard++ < 200000) {
    let n: string;
    if (hot.length && Math.random() < 0.6) n = String(10 + rnd(90)) + hot[rnd(hot.length)]; // 2-digit prefix + hot ending
    else n = String(100000 + rnd(900000));
    if (n.length === 6 && matches(n, o)) out.add(n);
  }
  return [...out];
}

/** Probability of a given digit-sum among 6-digit numbers (exact, via convolution). */
export function sumDistribution() {
  let dist = new Array(55).fill(0);
  for (let d = 1; d <= 9; d++) dist[d] = 1; // leading digit 1-9
  for (let pos = 1; pos < 6; pos++) {
    const next = new Array(55).fill(0);
    for (let s = 0; s < 55; s++) if (dist[s]) for (let d = 0; d <= 9 && s + d < 55; d++) next[s + d] += dist[s];
    dist = next;
  }
  return dist.map((c, s) => ({ sum: s, count: c, pct: (c / 900000) * 100 })).filter((x) => x.count > 0);
}
