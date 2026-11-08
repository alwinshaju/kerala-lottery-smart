"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Trophy, Clock, Sparkles, Coins, Flame, Copy, Check, Bookmark,
  Calendar, Layers, ShieldCheck, ChevronDown, ChevronUp, RefreshCw, Award
} from "lucide-react";
import {
  POOJA_BUMPER_2026,
  POOJA_BUMPER_TIERS,
  POOJA_BUMPER_SOURCE_URL,
  HISTORICAL_POOJA_WINNERS,
  TOP_POOJA_HOT_4,
  generatePoojaPicks,
  GeneratedPoojaTicket,
  PoojaGenFilter,
} from "@/lib/bumperData";
import { inr } from "@/lib/payout";
import { Digits } from "./Digits";
import { useApp } from "./Providers";

export function PoojaBumperCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number; expired: boolean }>({
    d: 0, h: 0, m: 0, s: 0, expired: false
  });

  useEffect(() => {
    const target = new Date(POOJA_BUMPER_2026.targetIso).getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, expired: true });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft({ d, h, m, s, expired: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft.expired) {
    return (
      <div className="rounded-2xl p-4 text-center bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
        <span className="font-bold">Draw held on Nov 28, 2026 at 2:00 PM IST</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="rounded-xl p-2.5 bg-black/25 backdrop-blur border border-white/10">
        <div className="mono text-2xl sm:text-3xl font-black text-amber-300">{String(timeLeft.d).padStart(2, "0")}</div>
        <div className="text-[10px] tracking-wider uppercase font-semibold text-white/80">Days</div>
      </div>
      <div className="rounded-xl p-2.5 bg-black/25 backdrop-blur border border-white/10">
        <div className="mono text-2xl sm:text-3xl font-black text-amber-300">{String(timeLeft.h).padStart(2, "0")}</div>
        <div className="text-[10px] tracking-wider uppercase font-semibold text-white/80">Hours</div>
      </div>
      <div className="rounded-xl p-2.5 bg-black/25 backdrop-blur border border-white/10">
        <div className="mono text-2xl sm:text-3xl font-black text-amber-300">{String(timeLeft.m).padStart(2, "0")}</div>
        <div className="text-[10px] tracking-wider uppercase font-semibold text-white/80">Mins</div>
      </div>
      <div className="rounded-xl p-2.5 bg-black/25 backdrop-blur border border-white/10">
        <div className="mono text-2xl sm:text-3xl font-black text-amber-300">{String(timeLeft.s).padStart(2, "0")}</div>
        <div className="text-[10px] tracking-wider uppercase font-semibold text-white/80">Secs</div>
      </div>
    </div>
  );
}

export function PoojaBumperHub() {
  const { lang } = useApp();
  const [activeTab, setActiveTab] = useState<"prizes" | "winners" | "generator">("prizes");
  const [viewMode, setViewMode] = useState<"net" | "gross">("net");

  // Generator states
  const [selectedSeries, setSelectedSeries] = useState<string>("all");
  const [sumMin, setSumMin] = useState<number>(24);
  const [sumMax, setSumMax] = useState<number>(29);
  const [requirePairs, setRequirePairs] = useState<boolean>(true);
  const [useHot, setUseHot] = useState<boolean>(true);
  const [count, setCount] = useState<number>(5);
  const [picks, setPicks] = useState<GeneratedPoojaTicket[]>(() => generatePoojaPicks({ count: 5 }));
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedTickets, setSavedTickets] = useState<Set<string>>(new Set());

  // Check which tickets are already in vault
  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem("vault.v1") || "[]");
      const set = new Set<string>(items.map((i: any) => i.ticket));
      setSavedTickets(set);
    } catch {}
  }, []);

  const handleGenerate = () => {
    const filter: PoojaGenFilter = {
      series: selectedSeries,
      sumMin,
      sumMax,
      requireRepeatPair: requirePairs,
      useHotEndings: useHot,
      count,
    };
    setPicks(generatePoojaPicks(filter));
  };

  const copyTicket = (ticket: string, idx: number) => {
    navigator.clipboard.writeText(ticket).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const saveToVault = (ticket: string) => {
    try {
      const current = JSON.parse(localStorage.getItem("vault.v1") || "[]");
      if (!current.some((x: any) => x.ticket === ticket && x.code === "BR")) {
        const newItem = {
          id: crypto.randomUUID(),
          ticket,
          date: POOJA_BUMPER_2026.drawDate,
          code: "BR",
        };
        const updated = [...current, newItem];
        localStorage.setItem("vault.v1", JSON.stringify(updated));
        setSavedTickets(new Set(updated.map((i: any) => i.ticket)));
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <section className="rounded-3xl p-5 text-white shadow-xl relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #854d0e 0%, #a16207 45%, #713f12 100%)" }}>
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-yellow-400/10 blur-xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="chip !text-[11px] !font-bold tracking-wide uppercase px-2.5 py-1 text-amber-950 bg-amber-300 border-none shadow-sm">
              🌟 {lang === "ml" ? "മെഗാ ബമ്പർ" : "FEATURED BUMPER"}
            </span>
            <span className="chip !text-[11px] !font-bold px-2 py-0.5 text-white bg-black/30 border-white/20">
              {POOJA_BUMPER_2026.drawNo}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              {lang === "ml" ? POOJA_BUMPER_2026.ml : POOJA_BUMPER_2026.name}
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 font-medium mt-0.5">
              {lang === "ml"
                ? "നറുക്കെടുപ്പ് തീയതി: 2026 നവംബർ 28 · ഉച്ചയ്ക്ക് 2:00 PM IST"
                : "Draw Date: Nov 28, 2026 · 2:00 PM IST"}
            </p>
          </div>

          {/* Jackpot Highlight */}
          <div className="rounded-2xl p-3.5 bg-black/25 backdrop-blur border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-200 tracking-wider uppercase">
                {lang === "ml" ? "ഒന്നാം സമ്മാനം" : "1ST PRIZE JACKPOT"}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                ₹12 Crore
              </div>
              <div className="text-[11px] text-amber-100/90 font-medium">
                {lang === "ml" ? "നികുതി കഴിഞ്ഞ് കൈയിൽ: ₹7.20 കോടി" : "Net in Hand after TDS & Comm: ₹7.20 Cr"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-amber-200 tracking-wider uppercase">
                {lang === "ml" ? "ടിക്കറ്റ് വില" : "TICKET PRICE"}
              </div>
              <div className="text-2xl font-black text-white">
                ₹300
              </div>
              <div className="text-[10px] text-amber-200 font-medium">
                5 {lang === "ml" ? "സീരീസുകൾ" : "Series"} (JA–JE)
              </div>
            </div>
          </div>

          {/* Live Countdown Timer */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
              <Clock size={14} className="animate-pulse" />
              {lang === "ml" ? "നറുക്കെടുപ്പിലേക്കുള്ള കൗണ്ട്ഡൗൺ" : "Live Draw Countdown"}
            </div>
            <PoojaBumperCountdown />
          </div>

          {/* Quick specs pill row */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-center font-medium text-amber-100">
            <div className="rounded-xl py-1.5 px-2 bg-white/10">
              <b className="text-white">45 Lakh</b> Tickets
            </div>
            <div className="rounded-xl py-1.5 px-2 bg-white/10">
              <b className="text-white">JA, JB, JC, JD, JE</b>
            </div>
            <div className="rounded-xl py-1.5 px-2 bg-white/10">
              <b className="text-white">762</b> 4-Digit Slots
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div className="seg" role="tablist">
        {([["prizes", Coins, "Prizes", "സമ്മാനങ്ങൾ"], ["winners", Trophy, "Past winners", "മുൻ വിജയികൾ"], ["generator", Sparkles, "Picks", "പിക്ക്"]] as const).map(([id, I, en, ml]) => (
          <button key={id} role="tab" aria-selected={activeTab === id} className="seg-btn amber" data-on={activeTab === id} onClick={() => setActiveTab(id)}>
            <I size={16} />{lang === "ml" ? ml : en}
          </button>
        ))}
      </div>

      {/* TAB 1: Complete Prize Breakdown & Net Payout Table */}
      {activeTab === "prizes" && (
        <section className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[color:var(--line)] pb-3">
            <div>
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                <Coins size={20} className="text-amber-500" />
                {lang === "ml" ? "പൂജ ബമ്പർ സമ്മാന ഘടന" : "Pooja Bumper Prize Structure"}
              </h2>
              <p className="text-xs muted">
                {lang === "ml"
                  ? "10% ഏജന്റ് കമ്മീഷനും 30% TDS നികുതിയും കുറച്ചുള്ള തുക"
                  : "Complete tier breakdown with 10% Agent Commission & 30% TDS Tax"}
              </p>
            </div>
            {/* View Mode Switcher */}
            <div className="flex gap-1.5 self-start">
              <button className="chip !min-h-0 !py-1 !text-xs" data-on={viewMode === "net"} onClick={() => setViewMode("net")}>{lang === "ml" ? "കൈയിൽ കിട്ടുന്നത്" : "Net in hand"}</button>
              <button className="chip !min-h-0 !py-1 !text-xs" data-on={viewMode === "gross"} onClick={() => setViewMode("gross")}>{lang === "ml" ? "ആകെ തുക" : "Gross"}</button>
            </div>
          </div>

          {/* Prize rows (mobile friendly: no sideways scrolling) */}
          <ul className="divide-y divide-[color:var(--line)]">
            {POOJA_BUMPER_TIERS.map((tier) => (
              <li key={tier.tier} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5">
                    {tier.tier === "first" && <Trophy size={15} className="text-amber-500 shrink-0" />}
                    {lang === "ml" ? tier.mlLabel : tier.label}
                    <span className={`chip !min-h-0 !py-0 !px-1.5 !text-[10px] !font-bold ${tier.ticketType === "full" ? "!bg-amber-500/15 !text-amber-700 dark:!text-amber-300" : "!bg-blue-500/15 !text-blue-700 dark:!text-blue-300"} !border-0`}>
                      {tier.ticketType === "full" ? "Full ticket" : "Last 4 digits"}
                    </span>
                  </div>
                  <div className="text-xs muted mt-0.5">{tier.winnersCount}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-lg leading-tight" style={{ color: viewMode === "net" ? "var(--brand-d)" : "var(--ink)" }}>
                    {inr(viewMode === "net" ? tier.netPayout : tier.grossAmount)}
                  </div>
                  <div className="text-[10px] muted">
                    {viewMode === "net" ? `of ${inr(tier.grossAmount)}` : `net ${inr(tier.netPayout)}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <a href={POOJA_BUMPER_SOURCE_URL} target="_blank" rel="noreferrer" className="block text-xs font-semibold underline" style={{ color: "var(--brand-d)" }}>
            Source: Kerala Gazette S.R.O. No. 783/2026 (official prize structure PDF) ↗
          </a>

          {/* Tax Explanatory Card */}
          <div className="rounded-2xl p-3.5 text-xs space-y-1.5" style={{ background: "var(--brand-soft)", color: "var(--ink)" }}>
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              Tax & Payout Rules (Section 194B of Income Tax Act):
            </div>
            <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed">
              <li><b>10% Agent Commission</b> is deducted from the gross prize before state payout.</li>
              <li><b>30% TDS</b> is applicable on all prize earnings above ₹10,000 (Section 194B).</li>
              <li>Prizes of ₹5,000, ₹1,000, ₹500, and ₹300 (6th–9th) have <b>0% TDS</b> because they are ≤ ₹10,000.</li>
              <li><b>762 four-digit endings are drawn:</b> 18 (6th) + 144 (7th) + 288 (8th) + 312 (9th). Each ending wins on every series that carries it.</li>
              <li>Surcharge and cess are not included here. Confirm the exact payout with the Directorate.</li>
            </ul>
          </div>
        </section>
      )}

      {/* TAB 2: Historical Pooja Bumper Winners (2018–2025) */}
      {activeTab === "winners" && (
        <section className="card space-y-4">
          <div>
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              {lang === "ml" ? "പൂജ ബമ്പർ ഒന്നാം സമ്മാന വിജയികൾ (2018–2025)" : "Historical Pooja Bumper Winners (2018–2025)"}
            </h2>
            <p className="text-xs muted">
              Past 1st prize tickets and the districts where they were sold (unverified, for interest only)
            </p>
          </div>

          {/* Key Spotlight: 2025 & 2024 Winners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl p-3.5 border-2 border-amber-400/40 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="chip !text-[10px] !font-bold bg-amber-400 text-amber-950 border-none">
                  2025 WINNER (BR-106)
                </span>
                <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400">₹12 Crore</span>
              </div>
              <div>
                <div className="mono text-2xl font-black tracking-tight" style={{ color: "var(--brand-d)" }}>
                  JD 545542
                </div>
                <div className="text-xs font-semibold">Palakkad · Sold by Babu (A-3482)</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] muted pt-1 border-t border-[color:var(--line)]">
                <span>Sum: <b>Σ25</b> (Sweet spot)</span>
                <span>·</span>
                <span>Pairs: <b>55, 44</b></span>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 border-2 border-amber-400/40 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="chip !text-[10px] !font-bold bg-amber-400 text-amber-950 border-none">
                  2024 WINNER (BR-100)
                </span>
                <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400">₹12 Crore</span>
              </div>
              <div>
                <div className="mono text-2xl font-black tracking-tight" style={{ color: "var(--brand-d)" }}>
                  JC 325526
                </div>
                <div className="text-xs font-semibold">Kayamkulam (Alappuzha) · Sold by Santhosh</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] muted pt-1 border-t border-[color:var(--line)]">
                <span>Sum: <b>Σ23</b></span>
                <span>·</span>
                <span>Pairs: <b>55, 22</b></span>
              </div>
            </div>
          </div>

          <ul className="divide-y divide-[color:var(--line)]">
            {HISTORICAL_POOJA_WINNERS.map((w) => (
              <li key={w.year} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{w.year} <span className="mono text-xs muted">{w.drawNo}</span></span>
                  <span className="font-black text-sm" style={{ color: "var(--brand-d)" }}>{w.prizeAmount}</span>
                </div>
                <Digits ticket={w.ticket} size="sm" />
                <div className="text-xs muted">{w.district}{w.agent ? ` · ${w.agent}` : ""} · Σ{w.digitSum}</div>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl p-3 text-xs space-y-1" style={{ background: "var(--gold-soft)" }}>
            <div className="font-bold">Please note</div>
            <p>These past winners were compiled by hand and are <b>not verified</b> against official results. They are here for interest only. Every ticket has exactly the same chance of winning, whatever its digits.</p>
          </div>
        </section>
      )}

      {/* TAB 3: Pooja Bumper Smart Number Generator */}
      {activeTab === "generator" && (
        <section className="card space-y-4">
          <div>
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              {lang === "ml" ? "പൂജ ബമ്പർ സ്മാർട്ട് നമ്പർ ജനറേറ്റർ" : "Pooja Bumper Smart Number Generator"}
            </h2>
            <p className="text-xs muted">
              Builds <span className="font-bold">JA–JE</span> combinations from digit sum, repeated digits and sample endings.
              A fun way to choose; it does not change your chances.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="space-y-3 rounded-2xl p-4 bg-[color:var(--bg)] border border-[color:var(--line)]">
            <div>
              <label className="text-xs font-bold muted block mb-1.5">Select Series</label>
              <div className="flex flex-wrap gap-1.5">
                {["all", "JA", "JB", "JC", "JD", "JE"].map((s) => (
                  <button
                    key={s}
                    className="chip !text-xs !py-1 !min-h-0"
                    data-on={selectedSeries === s}
                    onClick={() => setSelectedSeries(s)}
                  >
                    {s === "all" ? "All (JA–JE)" : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold muted block mb-1">Min Sum</label>
                <input
                  type="number"
                  min={15}
                  max={sumMax}
                  value={sumMin}
                  onChange={(e) => setSumMin(+e.target.value)}
                  className="input !min-h-0 !py-1.5 !text-sm mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold muted block mb-1">Max Sum</label>
                <input
                  type="number"
                  min={sumMin}
                  max={45}
                  value={sumMax}
                  onChange={(e) => setSumMax(+e.target.value)}
                  className="input !min-h-0 !py-1.5 !text-sm mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                className="chip !text-xs !py-1 !min-h-0"
                data-on={requirePairs}
                onClick={() => setRequirePairs(!requirePairs)}
              >
                Repeating digit pairs (55, 44, etc.)
              </button>
              <button
                className="chip !text-xs !py-1 !min-h-0"
                data-on={useHot}
                onClick={() => setUseHot(!useHot)}
              >
                Sample endings ({TOP_POOJA_HOT_4.join(", ")})
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs muted">Count:</span>
              <div className="flex gap-1">
                {[3, 5, 8].map((c) => (
                  <button
                    key={c}
                    className="chip !text-xs !py-1 !min-h-0"
                    data-on={count === c}
                    onClick={() => setCount(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn w-full mt-2 font-bold flex items-center justify-center gap-2"
              onClick={handleGenerate}
            >
              <RefreshCw size={16} />
              {lang === "ml" ? "പുതിയ നമ്പറുകൾ ജനറേറ്റ് ചെയ്യുക" : "Generate Pooja Bumper Combinations"}
            </button>
          </div>

          {/* Generated Combinations */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider muted">
              Generated Recommendations ({picks.length})
            </div>

            <div className="space-y-2">
              {picks.map((p, idx) => {
                const isSaved = savedTickets.has(p.fullTicket);
                const isCopied = copiedIndex === idx;

                return (
                  <div
                    key={p.fullTicket}
                    className="card !p-3 flex items-center justify-between gap-2 border hover:border-amber-400 transition"
                  >
                    <div>
                      <Digits ticket={p.fullTicket} />
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        <span className="chip !text-[10px] !py-0 !px-1.5 !min-h-0 bg-amber-500/15 text-amber-800 dark:text-amber-200 border-none font-bold">
                          Σ{p.sum}
                        </span>
                        {p.pairs.length > 0 && (
                          <span className="chip !text-[10px] !py-0 !px-1.5 !min-h-0 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-none font-bold">
                            Pair: {p.pairs.join(", ")}
                          </span>
                        )}
                        {p.hotEnding && (
                          <span className="chip !text-[10px] !py-0 !px-1.5 !min-h-0 bg-blue-500/15 text-blue-800 dark:text-blue-200 border-none font-bold">
                            Ending {p.hotEnding}
                          </span>
                        )}
                        <span className="muted text-[10px]">
                          Odd:Even {p.odd}:{p.even}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="btn btn-ghost !min-h-0 !p-2 !rounded-xl"
                        onClick={() => copyTicket(p.fullTicket, idx)}
                        title="Copy Ticket"
                        aria-label="Copy Ticket"
                      >
                        {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                      <button
                        className={`btn !min-h-0 !p-2 !rounded-xl ${
                          isSaved ? "bg-amber-500 text-white" : "btn-ghost"
                        }`}
                        onClick={() => saveToVault(p.fullTicket)}
                        title={isSaved ? "Saved in Vault" : "Save to My Tickets Vault"}
                        aria-label="Save to Vault"
                      >
                        <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] muted text-center italic">
            Every ticket has an identical chance of winning. These filters are for fun and do not guarantee anything.
          </p>
        </section>
      )}
    </div>
  );
}

