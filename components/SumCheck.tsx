"use client";
import { useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { analyse } from "@/lib/generator";
import { Digits } from "./Digits";

/** Accepts anything a person might type or paste ("PA 380169", "380 169", "pa-380169") and reads the last 6 digits. */
function extract(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const series = raw.toUpperCase().match(/[A-Z]{2}/)?.[0];
  return { digits: digits.slice(-6), count: digits.length, series };
}

export function SumCheck() {
  const [raw, setRaw] = useState("");
  const { digits, count, series } = useMemo(() => extract(raw), [raw]);
  const a = digits.length === 6 ? analyse(digits) : null;
  const pct = Math.min(100, (a ? a.sum / 54 : digits.split("").reduce((x, c) => x + +c, 0) / 54) * 100);

  async function paste() {
    try { setRaw(await navigator.clipboard.readText()); } catch { /* clipboard blocked: user can long-press paste */ }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Quick Sum Check</h2>
        <button type="button" className="chip !min-h-0 !py-1 !text-xs flex items-center gap-1" onClick={paste}><ClipboardPaste size={13} />Paste</button>
      </div>
      <input
        className="input mono !text-xl" inputMode="text" autoComplete="off" autoCapitalize="characters"
        placeholder="PA 380169 or 380169" value={raw} onChange={(e) => setRaw(e.target.value)}
        aria-describedby="sum-help"
      />
      <p id="sum-help" className="text-xs muted">Type or paste the ticket. Series letters are ignored; the last 6 digits are used.</p>

      {count > 0 && count < 6 && (
        <div className="rounded-2xl p-3 text-sm" style={{ background: "var(--brand-soft)" }}>
          <b>{6 - count} more digit{6 - count === 1 ? "" : "s"}</b> needed. So far: <span className="mono font-bold">{digits}</span>
        </div>
      )}

      {a && (
        <div className="rounded-2xl p-3 space-y-3" style={{ background: a.inSweetSpot ? "var(--brand-soft)" : "var(--gold-soft)" }}>
          <Digits ticket={`${series ?? ""} ${digits}`} />
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs muted font-bold uppercase">Digit sum</div>
              <div className="text-4xl font-black mono leading-none">{a.sum}</div>
            </div>
            <span className="chip !min-h-0 !py-1 !text-xs !font-bold" style={a.inSweetSpot ? { background: "var(--brand)", color: "var(--on-brand)", borderColor: "transparent" } : undefined}>
              {a.inSweetSpot ? "✓ In the common 25–30 range" : "Outside the common 25–30 range"}
            </span>
          </div>
          <div>
            <div className="relative h-3 rounded-full" style={{ background: "var(--line)" }}>
              <div className="absolute inset-y-0 rounded-full" style={{ left: `${(25 / 54) * 100}%`, width: `${(5 / 54) * 100}%`, background: "var(--brand)", opacity: .35 }} />
              <div className="absolute -top-1 w-1.5 h-5 rounded" style={{ left: `calc(${pct}% - 3px)`, background: "var(--ink)" }} />
            </div>
            <div className="flex justify-between text-[10px] muted mt-0.5"><span>0</span><span>25–30 common</span><span>54</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl p-2 text-center" style={{ background: "var(--card)" }}><div className="text-xs muted">Odd : Even</div><b className="mono">{a.odd} : {a.even}</b></div>
            <div className="rounded-xl p-2 text-center" style={{ background: "var(--card)" }}><div className="text-xs muted">Repeated digit</div><b>{a.repeat ? "Yes" : "No"}</b></div>
          </div>
          <p className="text-xs muted">This describes the shape of the number. It does not change the chance of winning.</p>
        </div>
      )}
      {count > 6 && <p className="text-xs muted">Using the last 6 digits of what you entered.</p>}
    </section>
  );
}
