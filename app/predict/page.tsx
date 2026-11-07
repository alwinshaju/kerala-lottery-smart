"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { smartPicks, hotPicks } from "@/lib/analytics";
import { isoDate, nowIST, lotteryForWeekday } from "@/lib/schedule";
import { analyse, generate, poolStats, sumDistribution, GenOptions } from "@/lib/generator";

export default function PredictPage() {
  const { draws, t } = useApp();
  const latest = draws[0];
  // The next draw: today's lottery until its result is published, then tomorrow's.
  const ist = nowIST();
  const resultOut = draws[0]?.date === isoDate(ist);
  const next = lotteryForWeekday((ist.getDay() + (resultOut ? 1 : 0)) % 7);
  const p3 = useMemo(() => smartPicks(draws, 3, 6, next.code), [draws, next.code]);
  const p4 = useMemo(() => smartPicks(draws, 4, 6, next.code), [draws, next.code]);
  const hot4 = useMemo(() => hotPicks(draws, 4, 8).map((x) => x.n), [draws]);

  const [sumMin, setMin] = useState(25); const [sumMax, setMax] = useState(30);
  const [bal, setBal] = useState<GenOptions["balances"]>(["3:3", "4:2"]);
  const [rep, setRep] = useState(true); const [useHot, setUseHot] = useState(true);
  const [out, setOut] = useState<string[]>([]);
  const opts: GenOptions = { sumMin, sumMax, balances: bal, requireRepeat: rep, count: 8, hot4: useHot ? hot4 : [] };
  const stats = useMemo(() => poolStats(opts), [sumMin, sumMax, bal, rep]); // eslint-disable-line
  const dist = useMemo(sumDistribution, []);
  const maxPct = Math.max(...dist.map((d) => d.pct));
  const [check, setCheck] = useState(""); const ca = /^\d{6}$/.test(check) ? analyse(check) : null;
  const toggleBal = (b: "3:3" | "4:2" | "2:4") => setBal((x) => (x.includes(b) ? x.filter((y) => y !== b) : [...x, b]));

  return (
    <>
      <p className="text-xs rounded-lg border border-amber-500 text-amber-600 dark:text-amber-300 p-2">{t("statDisclaimer")}</p>
      <section className="card space-y-3">
        <h2 className="font-bold">Smart Picks</h2>
        <p className="font-bold -mt-1" style={{ color: "var(--brand-d)" }}>For {resultOut ? "tomorrow's" : "today's"} draw: {next.name} · 3:00 PM</p>
        {latest && <p className="text-xs muted -mt-2">Uses all recent results (up to {latest.name}, {latest.date}); {next.name}'s own history counts double. Stays the same until the next result.</p>}
        {([["Last 3 digits (ABC)", p3], ["Last 4 digits (ABCD)", p4]] as const).map(([label, list]) => (
          <div key={label}><div className="text-xs muted mb-1">{label}</div>
            <div className="flex flex-wrap gap-2">{list.map((x) => <span key={x.n} className="mono text-xl font-bold rounded-lg px-3 py-1 border border-[color:var(--line)]">{x.n}</span>)}</div></div>
        ))}
        <p className="text-xs muted">Based on recency-weighted frequency of winning endings over 90 days.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Smart Number Generator (6-digit)</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>Sum min<input type="number" className="input" value={sumMin} min={1} max={54} onChange={(e) => setMin(+e.target.value)} /></label>
          <label>Sum max<input type="number" className="input" value={sumMax} min={1} max={54} onChange={(e) => setMax(+e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-2 text-sm items-center">
          Odd:Even {(["3:3", "4:2", "2:4"] as const).map((b) => <button key={b} className="chip" data-on={bal.includes(b)} onClick={() => toggleBal(b)}>{b}</button>)}
          <button className="chip" data-on={rep} onClick={() => setRep(!rep)}>Has repeated digit</button>
          <button className="chip" data-on={useHot} onClick={() => setUseHot(!useHot)}>Hot 4-digit endings</button>
        </div>
        <p className="text-sm muted">Filters keep <b>{stats.pass.toLocaleString("en-IN")}</b> of 9,00,000 numbers ({stats.pct.toFixed(1)}%).</p>
        <button className="btn w-full" onClick={() => setOut(generate(opts))}>Generate</button>
        <div className="flex flex-wrap gap-2">{out.map((n) => <span key={n} className="mono text-lg font-bold px-2 py-1 rounded-lg border border-[color:var(--line)]">{n} <span className="text-xs muted">Σ{analyse(n).sum}</span></span>)}</div>
        <div>
          <div className="text-xs muted mb-1">Digit-sum distribution of all 6-digit numbers (peak ≈ 27–28)</div>
          <div className="flex items-end gap-px h-20">{dist.map((d) => <div key={d.sum} title={`Σ${d.sum}: ${d.pct.toFixed(2)}%`} style={{ height: `${(d.pct / maxPct) * 100}%`, background: d.sum >= sumMin && d.sum <= sumMax ? "var(--brand)" : "var(--line)" }} className="flex-1" />)}</div>
        </div>
        <p className="text-xs muted">Honest note: every 6-digit number is equally likely. These filters follow the most common number shapes; they don't raise your odds.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">Quick Sum Check</h2>
        <input className="input mono text-lg" inputMode="numeric" maxLength={6} placeholder="6-digit number" value={check} onChange={(e) => setCheck(e.target.value.replace(/\D/g, ""))} />
        {ca && <p className="text-sm">Sum <b>{ca.sum}</b> {ca.inSweetSpot ? "✅ in 25–30" : "— outside 25–30"} · Odd:Even {ca.odd}:{ca.even} · {ca.repeat ? "has repeated digit" : "all digits distinct"}</p>}
      </section>
    </>
  );
}
