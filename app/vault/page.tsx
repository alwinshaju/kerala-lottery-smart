"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/components/Providers";
import { checkTicket, expandBundle, parseTicket, ordinal } from "@/lib/ticket";
import { isoDate, lotteryForWeekday, nowIST } from "@/lib/schedule";
import { isBumperDraw } from "@/lib/rowMap";
import { inr } from "@/lib/payout";

interface Saved { id: string; ticket: string; date: string; code: string }
const KEY = "vault.v1";

export default function VaultPage() {
  const { draws } = useApp();
  const [items, setItems] = useState<Saved[]>([]);
  const [date, setDate] = useState(() => isoDate(nowIST())); // IST date, not UTC
  const [bundle, setBundle] = useState(false);
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {} }, []);
  const persist = (x: Saved[]) => { setItems(x); try { localStorage.setItem(KEY, JSON.stringify(x)); } catch {} };

  function add() {
    setErr("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr("Pick the draw date");
    // Use the bumper draw held on that date if there is one, otherwise the weekday's weekly lottery.
    const bumper = draws.find((d) => d.date === date && isBumperDraw(d.code, d.drawNo));
    const code = bumper?.code ?? lotteryForWeekday(new Date(date + "T00:00").getDay()).code;
    const pa = parseTicket(a);
    if (!pa?.full) return setErr("Enter a full ticket, e.g. PA 380169 or JA 123456");
    let list = [`${pa.series} ${pa.number}`];
    if (bundle) {
      const pb = parseTicket(b);
      if (!pb?.full || pb.series !== pa.series) return setErr("Range end must be the same series, e.g. PA 380169");
      if (Math.abs(+pb.number - +pa.number) + 1 > 100) return setErr("A bundle range can hold at most 100 tickets. Split it into smaller ranges.");
      list = expandBundle(pa.series!, +pa.number, +pb.number);
    }
    const existing = new Set(items.map((i) => i.ticket + i.date));
    persist([...items, ...list.filter((t) => !existing.has(t + date)).map((t) => ({ id: crypto.randomUUID(), ticket: t, date, code }))]);
    setA(""); setB("");
  }

  const rows = useMemo(() => items.map((it) => {
    // The saved code may be the weekday lottery; a bumper held the same day also counts.
    const ds = draws.filter((x) => x.date === it.date && (x.code === it.code || isBumperDraw(x.code, x.drawNo)));
    const d = ds[0];
    const pt = parseTicket(it.ticket);
    const wins = d && pt ? ds.flatMap((x) => checkTicket(x, pt)) : null;
    return { it, d, wins };
  }), [items, draws]);
  const winners = rows.filter((r) => r.wins?.length);

  return (
    <>
      <section className="card space-y-3">
        <h2 className="font-bold">Save tickets before the 3 PM draw</h2>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={bundle} onChange={(e) => setBundle(e.target.checked)} /> Bundle range (e.g. PA 380160 → PA 380169)</label>
        <div className="flex gap-2">
          <input className="input mono" placeholder="PA 380160" value={a} onChange={(e) => setA(e.target.value)} />
          {bundle && <input className="input mono" placeholder="PA 380169" value={b} onChange={(e) => setB(e.target.value)} />}
        </div>
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button className="btn w-full" onClick={add}>Add to vault</button>
        <p className="text-xs muted">Stored only on this device. Auto-checked against the official result as soon as it is published.</p>
      </section>

      {winners.length > 0 && (
        <section className="card border-amber-500 space-y-1">
          <h2 className="font-bold">🎉 Winners</h2>
          {winners.map(({ it, wins }) => <div key={it.id} className="mono">{it.ticket} — {wins!.map((w) => `${inr(w.amount)} (${ordinal[w.tier]})`).join(", ")}</div>)}
        </section>
      )}

      <section className="card">
        <h2 className="font-bold mb-2">Saved ({items.length})</h2>
        <ul className="divide-y divide-[color:var(--line)]">
          {rows.map(({ it, d, wins }) => (
            <li key={it.id} className="py-2 flex items-center justify-between">
              <div><span className="mono font-bold">{it.ticket}</span> <span className="muted text-xs">{it.code} · {it.date}</span></div>
              <div className="flex items-center gap-3 text-sm">
                {!d ? <span className="muted">Pending</span> : wins!.length ? <b style={{ color: "var(--gold)" }}>WON</b> : <span className="muted">No prize</span>}
                <button onClick={() => persist(items.filter((x) => x.id !== it.id))} aria-label="delete"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
