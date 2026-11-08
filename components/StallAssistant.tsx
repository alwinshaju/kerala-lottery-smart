"use client";
import { useState, useMemo } from "react";
import {
  Store, Camera, Trophy, Sparkles, Plus, Trash2, Copy, Check,
  Bookmark, ArrowRight, Layers, HelpCircle, ChevronDown, ChevronUp, Flame
} from "lucide-react";
import { useApp } from "./Providers";
import { Scanner } from "./Scanner";
import { Digits } from "./Digits";
import { POOJA_BUMPER_2026 } from "@/lib/bumperData";
import {
  evaluateTicket,
  compareStallTickets,
  optimizeBundle,
  TicketEvaluation,
  BundleEvaluation,
} from "@/lib/stallScorer";

const SAMPLE_STALL_TICKETS = ["JA 680229", "JD 545542", "PA 380169", "JC 473560"];

export function StallAssistant() {
  const { draws, lang } = useApp();
  const [mode, setMode] = useState<"compare" | "bundle">("compare");

  // Mode 1: Compare Tickets
  const [tickets, setTickets] = useState<string[]>(["", ""]);
  const [scanIndex, setScanIndex] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedTickets, setSavedTickets] = useState<Set<string>>(() => {
    try {
      const items = JSON.parse(localStorage.getItem("vault.v1") || "[]");
      return new Set(items.map((i: any) => i.ticket));
    } catch {
      return new Set();
    }
  });

  // Mode 2: Bundle Optimizer
  const [bundlePrefix, setBundlePrefix] = useState<string>("47356");
  const [bundleSeries, setBundleSeries] = useState<string>("JA");
  const [showAllBundle, setShowAllBundle] = useState<boolean>(false);

  // Quick helper to save ticket into user vault
  const saveToVault = (ticket: string) => {
    try {
      const current = JSON.parse(localStorage.getItem("vault.v1") || "[]");
      if (!current.some((x: any) => x.ticket === ticket)) {
        const isBumper = /^J[A-E]\b/.test(ticket);
        const newItem = {
          id: crypto.randomUUID(),
          ticket,
          date: isBumper ? POOJA_BUMPER_2026.drawDate : new Date().toISOString().slice(0, 10),
          code: isBumper ? "BR" : "",
        };
        const updated = [...current, newItem];
        localStorage.setItem("vault.v1", JSON.stringify(updated));
        setSavedTickets(new Set(updated.map((i: any) => i.ticket)));
      }
    } catch {}
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Compare mode handlers
  const handleTicketChange = (index: number, val: string) => {
    const updated = [...tickets];
    updated[index] = val;
    setTickets(updated);
  };

  const addTicketSlot = () => {
    if (tickets.length < 6) {
      setTickets([...tickets, ""]);
    }
  };

  const removeTicketSlot = (index: number) => {
    if (tickets.length > 2) {
      setTickets(tickets.filter((_, i) => i !== index));
    } else {
      handleTicketChange(index, "");
    }
  };

  const loadSamples = () => {
    setTickets(SAMPLE_STALL_TICKETS);
  };

  const clearTickets = () => {
    setTickets(["", ""]);
  };

  // Evaluated ranked list
  const rankedTickets = useMemo(() => {
    return compareStallTickets(tickets, draws);
  }, [tickets, draws]);

  // Bundle evaluation
  const bundleResult: BundleEvaluation | null = useMemo(() => {
    return optimizeBundle(bundlePrefix, bundleSeries, draws);
  }, [bundlePrefix, bundleSeries, draws]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <section className="card space-y-2 border-emerald-500/30" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Store size={20} />
            </span>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">
                {lang === "ml" ? "സ്റ്റാൾ അസിസ്റ്റന്റ് (കടയിലെ ടിക്കറ്റ് പരിശോധന)" : "Stall Assistant"}
              </h1>
              <p className="text-xs muted">
                {lang === "ml"
                  ? "കടയുടെ കൗണ്ടറിലുള്ള ടിക്കറ്റുകൾ പരിശോധിച്ച് മികച്ചത് തിരഞ്ഞെടുക്കൂ"
                  : "Check & score tickets actually sitting on the lottery stall counter"}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="seg mt-2" role="tablist">
          <button role="tab" aria-selected={mode === "compare"} className="seg-btn" data-on={mode === "compare"} onClick={() => setMode("compare")}>
            <Layers size={16} />{lang === "ml" ? "താരതമ്യം" : "Compare"}
          </button>
          <button role="tab" aria-selected={mode === "bundle"} className="seg-btn" data-on={mode === "bundle"} onClick={() => setMode("bundle")}>
            <Sparkles size={16} />{lang === "ml" ? "ബണ്ടിൽ" : "Book / bundle"}
          </button>
        </div>
      </section>

      {/* MODE 1: COMPARE STALL TICKETS */}
      {mode === "compare" && (
        <div className="space-y-4">
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-sm sm:text-base">
                  {lang === "ml" ? "കൗണ്ടറിലെ ടിക്കറ്റുകൾ ടൈപ്പ് ചെയ്യുക" : "Enter Tickets on the Counter"}
                </h2>
                <p className="text-xs muted">
                  {lang === "ml"
                    ? "2 മുതൽ 6 ടിക്കറ്റ് നമ്പറുകൾ വരെ നൽകി ഏറ്റവും മികച്ചത് കണ്ടെത്തുക"
                    : "Add 2 to 6 tickets to rank them based on mathematical criteria"}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={loadSamples}
                  className="chip !text-[11px] !py-1 !px-2 !min-h-0 text-amber-700 dark:text-amber-300 bg-amber-500/10 border-none font-bold"
                >
                  {lang === "ml" ? "ഉദാഹരണം" : "Sample Tickets"}
                </button>
                <button
                  type="button"
                  onClick={clearTickets}
                  className="chip !text-[11px] !py-1 !px-2 !min-h-0 muted border-none"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Input list */}
            <div className="space-y-2">
              {tickets.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="mono text-xs font-bold w-5 text-center muted">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    inputMode="text"
                    value={t}
                    onChange={(e) => handleTicketChange(idx, e.target.value)}
                    placeholder="JA 680229"
                    className="input !min-h-0 !py-2 mono font-bold text-base flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setScanIndex(idx)}
                    className="btn btn-ghost !min-h-0 !p-2.5 !rounded-xl shrink-0"
                    title="Scan ticket with Camera"
                    aria-label="Scan with Camera"
                  >
                    <Camera size={18} />
                  </button>
                  {tickets.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeTicketSlot(idx)}
                      className="btn btn-ghost !min-h-0 !p-2.5 !rounded-xl shrink-0 text-red-500 hover:bg-red-500/10"
                      title="Remove"
                      aria-label="Remove ticket"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {tickets.length < 6 && (
              <button
                type="button"
                onClick={addTicketSlot}
                className="btn btn-ghost w-full !min-h-0 !py-2 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                {lang === "ml" ? "മറ്റൊരു ടിക്കറ്റ് ചേർക്കുക" : "Add Another Ticket (Max 6)"}
              </button>
            )}
          </section>

          {/* RANKED RESULTS */}
          {rankedTickets.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider muted">
                  {lang === "ml" ? "താരതമ്യ ഫലം" : "Ranked Evaluation"} ({rankedTickets.length})
                </div>
                <div className="text-xs muted">Scored out of 100 points</div>
              </div>

              {rankedTickets.map((item, idx) => {
                const isTop = idx === 0;
                const isSaved = savedTickets.has(item.ticket);
                const isCopied = copiedKey === item.ticket;

                // Color based on score
                let scoreColor = "text-emerald-600 dark:text-emerald-400";
                let badgeBg = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30";
                if (item.totalScore < 60) {
                  scoreColor = "text-rose-600 dark:text-rose-400";
                  badgeBg = "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30";
                } else if (item.totalScore < 75) {
                  scoreColor = "text-amber-600 dark:text-amber-400";
                  badgeBg = "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30";
                }

                return (
                  <div
                    key={item.ticket}
                    className={`card !p-4 space-y-3 transition border-2 ${
                      isTop
                        ? "border-amber-400 shadow-md bg-amber-500/5"
                        : "border-[color:var(--line)]"
                    }`}
                  >
                    {/* Header line with Rank & Score */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`mono text-xs font-black px-2 py-0.5 rounded-lg ${
                              isTop
                                ? "bg-amber-400 text-amber-950 font-black shadow-sm"
                                : "bg-[color:var(--line)] text-[color:var(--ink)]"
                            }`}
                          >
                            #{item.rank} {isTop && "BEST PICK"}
                          </span>
                          {isTop && (
                            <span className="chip !text-[10px] !py-0 !px-1.5 !min-h-0 bg-amber-400/20 text-amber-900 dark:text-amber-200 border-none font-bold flex items-center gap-1">
                              <Trophy size={11} className="text-amber-500" />
                              {lang === "ml" ? "ശുപാർശ ചെയ്യുന്നു ⭐" : "RECOMMENDED TO BUY ⭐"}
                            </span>
                          )}
                        </div>
                        <div className="pt-1"><Digits ticket={item.ticket} /></div>
                      </div>

                      {/* Total Score Circle / Pill */}
                      <div className="text-right">
                        <div className={`mono text-3xl font-black ${scoreColor}`}>
                          {item.totalScore}
                          <span className="text-xs font-normal muted">/100</span>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider muted">
                          Score
                        </div>
                      </div>
                    </div>

                    {/* Score breakdown as bars */}
                    <div className="space-y-2 pt-1">
                      {[
                        { l: "6-digit sum", sc: item.sumCriterion.score, max: 35, note: item.sumCriterion.badge },
                        { l: "4-digit history", sc: item.historyCriterion.score, max: 30, note: item.historyCriterion.badge },
                        { l: "Repeated digits", sc: item.patternCriterion.score, max: 20, note: item.patternCriterion.badge },
                        { l: "Odd : even", sc: item.balanceCriterion.score, max: 15, note: `${item.odd} odd · ${item.even} even` },
                      ].map((c) => (
                        <div key={c.l}>
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-semibold">{c.l}</span>
                            <span className="muted text-right"><span className="mr-1.5">{c.note}</span><b className="mono" style={{ color: "var(--ink)" }}>{c.sc}/{c.max}</b></span>
                          </div>
                          <div className="h-1.5 rounded-full mt-1" style={{ background: "var(--line)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(c.sc / c.max) * 100}%`, background: c.sc / c.max >= 0.75 ? "var(--brand)" : c.sc / c.max >= 0.4 ? "var(--gold)" : "var(--danger)" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-[color:var(--line)] text-xs">
                      <span className="text-[11px] muted italic truncate max-w-[200px]">
                        {item.sumCriterion.comment}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.ticket, item.ticket)}
                          className="btn btn-ghost !min-h-0 !py-1 !px-2.5 !text-xs !rounded-lg flex items-center gap-1"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => saveToVault(item.ticket)}
                          className={`btn !min-h-0 !py-1 !px-2.5 !text-xs !rounded-lg flex items-center gap-1 ${
                            isSaved ? "bg-amber-500 text-white" : "btn-ghost"
                          }`}
                        >
                          <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                          <span>{isSaved ? "Saved" : "Save"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Quick explanation guide */}
          <section className="card text-xs space-y-2" style={{ background: "var(--brand-soft)", color: "var(--ink)" }}>
            <div className="font-bold flex items-center gap-1.5">
              <HelpCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
              How Stall Tickets Are Scored (0–100 Formula):
            </div>
            <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed">
              <li><b>6-Digit Sum (35 pts):</b> Peak 35 pts for 26–28; 30 pts for sweet spot 24–25 or 29–30.</li>
              <li><b>4-Digit History (30 pts):</b> Points based on official repeat wins + hot ending bonus.</li>
              <li><b>Digit Repetition (20 pts):</b> Full 20 pts for 1 or 2 repeating digit pairs (84.88% of all 6-digit numbers have a repeated digit).</li>
              <li><b>Odd/Even Balance (15 pts):</b> 15 pts for 3:3 split; 12 pts for 4:2 or 2:4 split.</li>
            </ul>
            <p className="font-semibold">The score describes the shape of a number. Every ticket has the same chance of winning, so use it for fun, not as a promise.</p>
          </section>
        </div>
      )}

      {/* MODE 2: BUNDLE / BOOK OPTIMIZER */}
      {mode === "bundle" && (
        <div className="space-y-4">
          <section className="card space-y-3">
            <div>
              <h2 className="font-extrabold text-sm sm:text-base">
                {lang === "ml" ? "ബണ്ടിലിന്റെ ആദ്യ 4 അല്ലെങ്കിൽ 5 അക്കങ്ങൾ നൽകുക" : "Enter First 4 or 5 Digits of the Bundle"}
              </h2>
              <p className="text-xs muted">
                {lang === "ml"
                  ? "സ്റ്റാളിലെ 10 ടിക്കറ്റ് അല്ലെങ്കിൽ 100 ടിക്കറ്റ് ബുക്കിൽ നിന്ന് ഏറ്റവും മികച്ച 3 ടിക്കറ്റുകൾ കണ്ടെത്തൂ"
                  : "Stalls sell sequential books of 10 (5-digit prefix) or 100 (4-digit prefix). Find the top 3 tickets in that book."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold muted block mb-1">First digits of the book</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={bundlePrefix}
                  onChange={(e) => setBundlePrefix(e.target.value.replace(/\D/g, ""))}
                  placeholder="47356"
                  className="input !min-h-0 !py-2.5 mono font-black text-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold muted block mb-1">Series</label>
                <div className="flex gap-1 overflow-x-auto">
                  {["JA", "JB", "JC", "JD", "JE", "PA"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip !text-xs !py-1 !px-2.5 !min-h-0 font-bold"
                      data-on={bundleSeries === s}
                      onClick={() => setBundleSeries(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="muted">Try:</span>
              <button
                type="button"
                className="chip !text-[11px] !py-0.5 !px-2 !min-h-0 font-bold"
                onClick={() => setBundlePrefix("47356")}
              >
                47356 (10-pack)
              </button>
              <button
                type="button"
                className="chip !text-[11px] !py-0.5 !px-2 !min-h-0 font-bold"
                onClick={() => setBundlePrefix("4735")}
              >
                4735 (100-pack)
              </button>
              <button
                type="button"
                className="chip !text-[11px] !py-0.5 !px-2 !min-h-0 font-bold"
                onClick={() => setBundlePrefix("5455")}
              >
                5455 (example)
              </button>
            </div>
          </section>

          {/* Prefix validation: never leave the screen blank */}
          {!bundleResult && (
            <div className="card text-center space-y-1">
              <div className="text-3xl">📚</div>
              <div className="font-bold">{bundlePrefix.length === 0 ? "Type the first digits of the book" : "Need 4 or 5 digits"}</div>
              <p className="text-xs muted">5 digits = a book of 10 tickets. 4 digits = a book of 100 tickets. You'll see the best tickets to pull.</p>
            </div>
          )}

          {/* Bundle Evaluation Results */}
          {bundleResult && (() => {
            const ranked = [...bundleResult.allTickets].sort((x, y) => (x.rank ?? 0) - (y.rank ?? 0));
            const visible = showAllBundle ? ranked : ranked.slice(0, 10);
            const first = bundleResult.allTickets[0]?.ticket.replace(/\D/g, "") ?? "";
            const last = bundleResult.allTickets[bundleResult.allTickets.length - 1]?.ticket.replace(/\D/g, "") ?? "";
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-base leading-tight">Best tickets to pull</h2>
                    <div className="text-xs muted mt-0.5">{bundleSeries} {first} to {last}</div>
                  </div>
                  <span className="chip !min-h-0 !py-1 !text-xs !font-bold shrink-0" style={{ background: "var(--gold-soft)", color: "var(--gold)", borderColor: "transparent" }}>
                    Book of {bundleResult.bundleSize}
                  </span>
                </div>

                {/* Top 3 */}
                <div className="space-y-2.5">
                  {bundleResult.topPicks.map((pick, i) => {
                    const medal = [["🥇", "Best to pull", "#f59e0b"], ["🥈", "Runner up", "#94a3b8"], ["🥉", "Third pick", "#b45309"]][i];
                    const isSaved = savedTickets.has(pick.ticket);
                    const isCopied = copiedKey === pick.ticket;
                    return (
                      <div key={pick.ticket} className="card !p-3.5 space-y-2.5" style={{ borderWidth: 2, borderColor: i === 0 ? medal[2] : "var(--line)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: medal[2] }}>{medal[0]} {medal[1]}</span>
                          <span className="mono font-black text-xl leading-none" style={{ color: "var(--brand-d)" }}>{pick.totalScore}<span className="text-xs muted font-semibold">/100</span></span>
                        </div>
                        <Digits ticket={pick.ticket} />
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="chip !min-h-0 !py-0.5 !px-2 !border-0 !font-bold" style={{ background: "var(--brand-soft)" }}>{pick.sumCriterion.badge}</span>
                          {pick.repeatingPairs.length > 0 && <span className="chip !min-h-0 !py-0.5 !px-2 !border-0 !font-bold" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>Pair {pick.repeatingPairs.join(", ")}</span>}
                          <span className="muted">{pick.odd} odd · {pick.even} even · ends {pick.fourDigitEnding}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => copyToClipboard(pick.ticket, pick.ticket)} className="btn btn-ghost flex-1 !min-h-0 !py-2 !text-sm">
                            {isCopied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}{isCopied ? "Copied" : "Copy"}
                          </button>
                          <button type="button" onClick={() => saveToVault(pick.ticket)} className="btn btn-ghost flex-1 !min-h-0 !py-2 !text-sm" style={isSaved ? { background: "#f59e0b", color: "#fff", borderColor: "#f59e0b" } : undefined}>
                            <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />{isSaved ? "Saved" : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Whole book, best first. Flows with the page (no nested scrolling). */}
                <div className="card !p-0 overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide muted border-b border-[color:var(--line)]">All tickets, best first</div>
                  <ul className="divide-y divide-[color:var(--line)]">
                    {visible.map((t) => (
                      <li key={t.ticket} className="px-3 py-2 flex items-center gap-2">
                        <span className="mono text-xs font-bold w-7 text-center muted">#{t.rank}</span>
                        <div className="min-w-0 flex-1"><Digits ticket={t.ticket} size="sm" /></div>
                        <span className="mono font-extrabold text-sm w-8 text-right" style={{ color: "var(--brand-d)" }}>{t.totalScore}</span>
                        <button type="button" onClick={() => saveToVault(t.ticket)} className="p-1.5 rounded-lg" aria-label={`Save ${t.ticket}`}>
                          <Bookmark size={16} fill={savedTickets.has(t.ticket) ? "currentColor" : "none"} style={{ color: savedTickets.has(t.ticket) ? "#f59e0b" : "var(--mute)" }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {ranked.length > 10 && (
                    <button type="button" onClick={() => setShowAllBundle(!showAllBundle)} className="w-full py-3 text-sm font-bold flex items-center justify-center gap-1.5 border-t border-[color:var(--line)]" style={{ color: "var(--brand-d)" }}>
                      {showAllBundle ? <>Show fewer <ChevronUp size={16} /></> : <>Show all {ranked.length} <ChevronDown size={16} /></>}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Camera Scanner Modal for fast scanning at the stall */}
      {scanIndex !== null && (
        <Scanner
          onFound={(raw) => {
            const clean = raw.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
            const m = clean.match(/\b([A-Z]{2})\s?(\d{6})\b/) || clean.match(/\b(\d{6})\b/);
            const foundTicket = m ? (m[2] ? `${m[1]} ${m[2]}` : m[1]) : raw;
            handleTicketChange(scanIndex, foundTicket);
            setScanIndex(null);
          }}
          onClose={() => setScanIndex(null)}
        />
      )}
    </div>
  );
}

