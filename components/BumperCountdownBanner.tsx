"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Clock, Trophy } from "lucide-react";
import { POOJA_BUMPER_2026 } from "@/lib/bumperData";
import { useApp } from "./Providers";

export function BumperCountdownBanner({ onExplore }: { onExplore?: () => void }) {
  const { lang } = useApp();
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

  return (
    <div
      className="rounded-3xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden transition hover:shadow-xl"
      style={{
        background: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #92400e 100%)",
        border: "1px solid rgba(251, 191, 36, 0.35)",
      }}
    >
      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs">
              🔥
            </span>
            <span className="text-xs font-black tracking-wide text-amber-200 uppercase">
              {lang === "ml" ? "സജീവ ബമ്പർ ലോട്ടറി" : "ACTIVE BUMPER LOTTERY"}
            </span>
          </div>
          <span className="chip !text-[11px] !font-bold px-2 py-0.5 text-white bg-black/30 border-white/20">
            {POOJA_BUMPER_2026.drawNo}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {lang === "ml" ? POOJA_BUMPER_2026.ml : POOJA_BUMPER_2026.name}
            </h2>
            <div className="text-xs text-amber-100 font-semibold mt-0.5">
              1st Prize: <span className="text-amber-300 font-extrabold text-sm">₹12 Crore</span> · Ticket: ₹300
            </div>
          </div>
          <div className="text-right text-[11px] text-amber-200 font-medium">
            28 Nov 2026 · 2:00 PM
          </div>
        </div>

        {/* Live Countdown Display */}
        <div className="rounded-2xl p-2.5 bg-black/30 backdrop-blur border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
            <Clock size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Draw in:</span>
          </div>

          <div className="flex items-center gap-2 mono text-base sm:text-lg font-black text-amber-300">
            <span>{timeLeft.d}d</span>
            <span className="text-white/40">:</span>
            <span>{String(timeLeft.h).padStart(2, "0")}h</span>
            <span className="text-white/40">:</span>
            <span>{String(timeLeft.m).padStart(2, "0")}m</span>
            <span className="text-white/40">:</span>
            <span>{String(timeLeft.s).padStart(2, "0")}s</span>
          </div>

          {onExplore ? (
            <button
              onClick={onExplore}
              className="chip !text-[11px] !font-bold !py-1 !px-2.5 !min-h-0 bg-amber-400 text-amber-950 border-none shadow flex items-center gap-1"
            >
              Hub <ArrowRight size={12} />
            </button>
          ) : (
            <Link
              href="/bumper"
              className="chip !text-[11px] !font-bold !py-1 !px-2.5 !min-h-0 bg-amber-400 text-amber-950 border-none shadow flex items-center gap-1"
            >
              Hub <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

