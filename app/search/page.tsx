"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Search } from "lucide-react";
import { useApp } from "@/components/Providers";
import { Scanner } from "@/components/Scanner";
import { ShareImage } from "@/components/ShareImage";
import { checkTicket, parseTicket, ordinal } from "@/lib/ticket";
import { searchFour } from "@/lib/analytics";
import { inr } from "@/lib/payout";

export default function SearchPage() {
  const { draws, t } = useApp();
  const [q, setQ] = useState("");
  const [drawId, setDrawId] = useState("");
  const [scan, setScan] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // deep link from Analytics: /search?q=0229
  useEffect(() => { const v = new URLSearchParams(location.search).get("q"); if (v) { setQ(v); setDone(v); } }, []);

  const draw = draws.find((d) => d.id === drawId) ?? draws[0];
  const parsed = useMemo(() => (done ? parseTicket(done) : null), [done]);
  const wins = draw && parsed ? checkTicket(draw, parsed) : [];
  const four = parsed && parsed.number.length >= 4 ? parsed.number.slice(-4) : null;
  const insights = four ? searchFour(draws, four) : null;

  const found = useCallback((raw: string) => { setQ(raw); setDone(raw); setScan(false); }, []);

  return (
    <>
      <form className="card space-y-3" onSubmit={(e) => { e.preventDefault(); setDone(q); }}>
        <select className="input" value={draw?.id ?? ""} onChange={(e) => setDrawId(e.target.value)}>
          {draws.slice(0, 60).map((d) => <option key={d.id} value={d.id}>{d.name} · {d.drawNo} · {d.date}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="input mono text-lg" placeholder={t("ticketPh")} value={q} onChange={(e) => setQ(e.target.value)} inputMode="text" />
          <button type="button" className="btn btn-ghost" onClick={() => setScan(true)} aria-label={t("scan")}><Camera /></button>
        </div>
        <button className="btn w-full"><Search size={16} />{t("check")}</button>
        {done && !parsed && <p className="text-red-500 text-sm">Enter a ticket like “PA 380169”, a 6-digit number, or the last 4 digits.</p>}
      </form>

      {parsed && draw && (
        <ShareImage filename="ticket-check.png">
          <div className="rounded-2xl p-5 text-center text-white" style={{ background: wins.length ? "linear-gradient(160deg,#b45309,#78350f)" : "linear-gradient(160deg,#334155,#0f172a)" }}>
            <div className="mono text-2xl font-extrabold">{parsed.series ? parsed.series + " " : ""}{parsed.number}</div>
            {wins.length ? (
              <>
                <div className="text-3xl mt-2">🎉 {t("won")}</div>
                {wins.map((w, i) => <div key={i} className="text-xl font-bold mt-1" style={{ color: "#fde68a" }}>{inr(w.amount)} — {ordinal[w.tier]} Prize</div>)}
              </>
            ) : <div className="text-xl mt-2">{t("noWin")}</div>}
            <div className="text-xs opacity-80 mt-2">{draw.name} {draw.drawNo} · {draw.date}</div>
            {!draw.verified && <div className="text-xs mt-1 opacity-90">Based on unofficial data; the official PDF is not published yet.</div>}
            {!parsed.full && <div className="text-xs opacity-80">Last-digits match only — confirm the series on the physical ticket.</div>}
          </div>
        </ShareImage>
      )}

      {insights && four && (
        <section className="card space-y-2">
          <h2 className="font-bold">90-day history for <span className="mono">{four}</span></h2>
          <p className="text-sm muted">{insights.last90} wins in the last 90 days · {insights.allTime} in all stored draws</p>
          <ul className="divide-y divide-[color:var(--line)] text-sm">
            {insights.recent.slice(0, 30).map((h, i) => <li key={i} className="py-1.5 flex justify-between"><span>{h.draw.name} ({h.draw.drawNo})</span><span className="muted">{h.draw.date} · {h.tierLabel}</span></li>)}
            {!insights.recent.length && <li className="py-2 muted">No wins in the last 90 days.</li>}
          </ul>
        </section>
      )}
      {scan && <Scanner onFound={found} onClose={() => setScan(false)} />}
    </>
  );
}
