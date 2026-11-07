"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/Providers";
import { WEEKLY, isoDate, nowIST, lotteryForWeekday } from "@/lib/schedule";
import { inr } from "@/lib/payout";

interface Entry { id: string; date: string; code: string; tickets: number; spent: number; won: number; note: string }
const KEY = "ledger.v2", LIMIT = "limit.v1", PRICE = "ticketPrice.v1";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function load(): Entry[] {
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) return JSON.parse(cur);
    // migrate the earlier simple ledger (separate "spent"/"won" rows)
    const old = JSON.parse(localStorage.getItem("ledger.v1") || "[]") as { id: string; date: string; kind: "spent" | "won"; amount: number; note: string }[];
    return old.map((o) => ({ id: o.id, date: o.date, code: "", tickets: 0, spent: o.kind === "spent" ? o.amount : 0, won: o.kind === "won" ? o.amount : 0, note: o.note }));
  } catch { return []; }
}
const sum = (rows: Entry[]) => ({ spent: rows.reduce((a, r) => a + r.spent, 0), won: rows.reduce((a, r) => a + r.won, 0) });

function Stat({ label, spent, won }: { label: string; spent: number; won: number }) {
  const net = won - spent;
  return (
    <div className="card !p-3 text-center">
      <div className="text-xs font-bold muted uppercase">{label}</div>
      <div className="text-xl font-extrabold mono" style={{ color: net >= 0 ? "var(--brand)" : "var(--danger)" }}>{net >= 0 ? "+" : "−"}{inr(Math.abs(net))}</div>
      <div className="text-[11px] muted">Spent {inr(spent)}<br />Won {inr(won)}</div>
    </div>
  );
}

export default function LedgerPage() {
  const { lang } = useApp();
  const ml = lang === "ml";
  const today = isoDate(nowIST());
  const [rows, setRows] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [limit, setLimit] = useState(0);
  const [price, setPrice] = useState(50);
  const [year, setYear] = useState(+today.slice(0, 4));

  // form
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [code, setCode] = useState("");
  const [tickets, setTickets] = useState("");
  const [spent, setSpent] = useState("");
  const [won, setWon] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setRows(load());
    try { setLimit(+(localStorage.getItem(LIMIT) || 0)); setPrice(+(localStorage.getItem(PRICE) || 50)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {} }, [rows, ready]);
  useEffect(() => { setCode(lotteryForWeekday(new Date(date + "T00:00").getDay()).code); }, [date]);

  const month = today.slice(0, 7);
  const tDay = sum(rows.filter((r) => r.date === today));
  const tMonth = sum(rows.filter((r) => r.date.startsWith(month)));
  const yRows = rows.filter((r) => r.date.startsWith(String(year)));
  const tYear = sum(yRows);
  const years = useMemo(() => [...new Set([+today.slice(0, 4), ...rows.map((r) => +r.date.slice(0, 4))])].sort((a, b) => b - a), [rows, today]);
  const byMonth = MONTHS.map((_, i) => sum(yRows.filter((r) => +r.date.slice(5, 7) === i + 1)));
  const maxM = Math.max(1, ...byMonth.map((m) => Math.max(m.spent, m.won)));
  const days = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const r of [...yRows].sort((a, b) => b.date.localeCompare(a.date))) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [yRows]);

  function reset() { setEditId(null); setDate(today); setTickets(""); setSpent(""); setWon(""); setNote(""); }
  function save() {
    const sp = +spent || 0, wn = +won || 0;
    if (!sp && !wn) return;
    const e: Entry = { id: editId ?? crypto.randomUUID(), date, code, tickets: +tickets || 0, spent: sp, won: wn, note };
    setRows((r) => (editId ? r.map((x) => (x.id === editId ? e : x)) : [e, ...r]));
    reset();
  }
  function edit(r: Entry) { setEditId(r.id); setDate(r.date); setCode(r.code); setTickets(r.tickets ? String(r.tickets) : ""); setSpent(r.spent ? String(r.spent) : ""); setWon(r.won ? String(r.won) : ""); setNote(r.note); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function csv() {
    const lines = ["date,lottery,tickets,spent,won,note", ...rows.sort((a, b) => a.date.localeCompare(b.date)).map((r) => [r.date, r.code, r.tickets, r.spent, r.won, JSON.stringify(r.note)].join(","))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "lottery-ledger.csv"; a.click();
  }
  const onTickets = (v: string) => { const n = v.replace(/\D/g, ""); setTickets(n); if (n) setSpent(String(+n * price)); };
  const usedPct = limit ? (tMonth.spent / limit) * 100 : 0;

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold">{ml ? "എന്റെ കണക്ക്" : "My ledger"}</h1>
        <p className="muted text-sm">{ml ? "ഈ ഫോണിൽ മാത്രം സൂക്ഷിക്കുന്നു. മറ്റാരും കാണില്ല." : "Private: saved only on this phone."}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={ml ? "ഇന്ന്" : "Today"} {...tDay} />
        <Stat label={ml ? "ഈ മാസം" : "Month"} {...tMonth} />
        <Stat label={ml ? "ഈ വർഷം" : "Year"} {...sum(rows.filter((r) => r.date.startsWith(today.slice(0, 4))))} />
      </div>

      {/* add / edit */}
      <section className="card space-y-3">
        <h2 className="font-bold">{editId ? (ml ? "തിരുത്തുക" : "Edit entry") : (ml ? "പുതിയ എൻട്രി" : "Add today's entry")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs muted">{ml ? "തീയതി" : "Date"}<input type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-xs muted">{ml ? "ലോട്ടറി" : "Lottery"}
            <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>{WEEKLY.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}<option value="">Other / bumper</option></select></label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs muted">{ml ? "ടിക്കറ്റ്" : "Tickets"}<input className="input" inputMode="numeric" placeholder="0" value={tickets} onChange={(e) => onTickets(e.target.value)} /></label>
          <label className="text-xs muted">{ml ? "ചെലവ് ₹" : "Spent ₹"}<input className="input" inputMode="numeric" placeholder="0" value={spent} onChange={(e) => setSpent(e.target.value.replace(/\D/g, ""))} /></label>
          <label className="text-xs muted">{ml ? "സമ്മാനം ₹" : "Won ₹"}<input className="input" inputMode="numeric" placeholder="0" value={won} onChange={(e) => setWon(e.target.value.replace(/\D/g, ""))} /></label>
        </div>
        <p className="text-xs muted">Ticket price ₹<input className="input !inline-block !w-20 !min-h-0 !py-1 mx-1" inputMode="numeric" value={price} onChange={(e) => { const v = +e.target.value.replace(/\D/g, "") || 0; setPrice(v); try { localStorage.setItem(PRICE, String(v)); } catch {} }} /> {ml ? "(ടിക്കറ്റ് എണ്ണം നൽകിയാൽ ചെലവ് സ്വയം വരും)" : "(typing tickets fills Spent for you)"}</p>
        <input className="input" placeholder={ml ? "കുറിപ്പ് (ഓപ്ഷണൽ)" : "Note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex gap-2"><button className="btn flex-1" onClick={save}>{editId ? (ml ? "സേവ്" : "Save changes") : (ml ? "ചേർക്കുക" : "Add entry")}</button>{editId && <button className="btn btn-ghost" onClick={reset}>Cancel</button>}</div>
      </section>

      {/* monthly limit */}
      <section className="card space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{ml ? "മാസ പരിധി" : "Monthly limit"}</h2>
          <label className="flex items-center gap-1 text-sm">₹<input className="input !w-28 !min-h-0 !py-1.5" inputMode="numeric" placeholder="0 = none" value={limit || ""} onChange={(e) => { const v = +e.target.value.replace(/\D/g, ""); setLimit(v); try { localStorage.setItem(LIMIT, String(v)); } catch {} }} /></label>
        </div>
        {limit > 0 && (<>
          <div className="h-3 rounded-full" style={{ background: "var(--line)" }}><div className="h-3 rounded-full" style={{ width: `${Math.min(100, usedPct)}%`, background: usedPct >= 100 ? "var(--danger)" : usedPct >= 80 ? "var(--gold)" : "var(--brand)" }} /></div>
          <p className="text-sm">{inr(tMonth.spent)} / {inr(limit)} {usedPct >= 100 ? (ml ? "— പരിധി കഴിഞ്ഞു. ഈ മാസം വിശ്രമിക്കാം." : "— limit reached. Consider a break this month.") : usedPct >= 80 ? (ml ? "— 80% ആയി." : "— 80% used.") : ""}</p>
        </>)}
      </section>

      {/* year view */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{ml ? "വർഷത്തെ കണക്ക്" : "Year summary"}</h2>
          <div className="flex gap-1">{years.map((y) => <button key={y} className="chip" data-on={year === y} onClick={() => setYear(y)}>{y}</button>)}</div>
        </div>
        <div className="grid grid-cols-3 text-center">
          <div><div className="text-xs muted">{ml ? "ആകെ ചെലവ്" : "Total spent"}</div><b className="mono">{inr(tYear.spent)}</b></div>
          <div><div className="text-xs muted">{ml ? "ആകെ സമ്മാനം" : "Total won"}</div><b className="mono">{inr(tYear.won)}</b></div>
          <div><div className="text-xs muted">Net</div><b className="mono" style={{ color: tYear.won - tYear.spent >= 0 ? "var(--brand)" : "var(--danger)" }}>{tYear.won - tYear.spent >= 0 ? "+" : "−"}{inr(Math.abs(tYear.won - tYear.spent))}</b></div>
        </div>
        <div className="flex items-end gap-1 h-28">
          {byMonth.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-px h-20 w-full justify-center">
                <div title={`Spent ${inr(m.spent)}`} style={{ height: `${(m.spent / maxM) * 100}%`, background: "var(--danger)", opacity: .75 }} className="w-1/2 rounded-t min-h-px" />
                <div title={`Won ${inr(m.won)}`} style={{ height: `${(m.won / maxM) * 100}%`, background: "var(--brand)" }} className="w-1/2 rounded-t min-h-px" />
              </div>
              <span className="text-[9px] muted">{MONTHS[i][0]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs muted"><span><span style={{ color: "var(--danger)" }}>■</span> {ml ? "ചെലവ്" : "Spent"}</span><span><span style={{ color: "var(--brand)" }}>■</span> {ml ? "സമ്മാനം" : "Won"}</span></div>
      </section>

      {/* daily history */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">{ml ? "ദിവസവും" : "Day by day"}</h2>
          <button className="chip flex items-center gap-1" onClick={csv}><Download size={14} />CSV</button></div>
        {!days.length && <p className="muted text-sm">{ml ? "ഇതുവരെ എൻട്രികളില്ല." : "No entries yet."}</p>}
        {days.map(([d, list]) => {
          const t = sum(list);
          return (
            <div key={d}>
              <div className="flex justify-between text-sm font-bold"><span>{new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="mono" style={{ color: t.won - t.spent >= 0 ? "var(--brand)" : "var(--danger)" }}>{t.won - t.spent >= 0 ? "+" : "−"}{inr(Math.abs(t.won - t.spent))}</span></div>
              <ul className="divide-y divide-[color:var(--line)]">
                {list.map((r) => (
                  <li key={r.id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0"><b>{WEEKLY.find((l) => l.code === r.code)?.name ?? "Other"}</b>{r.tickets ? ` · ${r.tickets} tkt` : ""}<br /><span className="muted text-xs">{r.spent ? `Spent ${inr(r.spent)}` : ""}{r.spent && r.won ? " · " : ""}{r.won ? `Won ${inr(r.won)}` : ""}{r.note ? ` · ${r.note}` : ""}</span></span>
                    <span className="flex gap-3 shrink-0"><button onClick={() => edit(r)} aria-label="edit"><Pencil size={16} /></button><button onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} aria-label="delete"><Trash2 size={16} /></button></span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      <p className="text-xs muted">Play only what you can afford to lose. Need support? tele-MANAS 14416.</p>
    </>
  );
}
