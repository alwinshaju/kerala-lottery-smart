"use client";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Info, CalendarDays, Flame, NotebookPen, ScanLine, Sparkles, Wallet, ChevronDown, Trophy, Store } from "lucide-react";
import { useApp } from "@/components/Providers";
import { DrawCard, AwaitingBanner } from "@/components/DrawCard";
import { ShareImage } from "@/components/ShareImage";
import { ResultPoster } from "@/components/ResultPoster";
import { AlertsCard } from "@/components/AlertsCard";
import { VoiceButton } from "@/components/VoiceButton";
import { WEEKLY, isoDate, nowIST, lotteryForWeekday } from "@/lib/schedule";

const TILES = [
  { href: "/stall", I: Store, en: "Stall Assistant", ml: "കടയിലെ ടിക്കറ്റ്" },
  { href: "/bumper", I: Trophy, en: "Pooja Bumper", ml: "പൂജ ബമ്പർ" },
  { href: "/search", I: ScanLine, en: "Check ticket", ml: "ടിക്കറ്റ് പരിശോധന" },
  { href: "/vault", I: Wallet, en: "My tickets", ml: "എന്റെ ടിക്കറ്റ്" },
  { href: "/analytics", I: Flame, en: "Hot numbers", ml: "ഹോട്ട് നമ്പർ" },
  { href: "/predict", I: Sparkles, en: "Smart picks", ml: "സ്മാർട്ട് പിക്ക്" },
] as const;

export default function HomePage() {
  const { draws, loading, t, lang } = useApp();
  const [sel, setSel] = useState(0);
  const recent = draws.slice(0, 7);
  const draw = recent[sel];
  const today = isoDate(nowIST());
  const todays = lotteryForWeekday(nowIST().getDay());
  const waiting = draws.length > 0 && draws[0].date !== today;
  const dayName = (d: string) => new Date(d + "T00:00").toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", { weekday: "short" });
  const dateLabel = draw && new Date(draw.date + "T00:00").toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <>
      <>
          <AwaitingBanner latestIsToday={draws[0]?.date === today} />
          {loading && <div className="card muted">Loading…</div>}
          {!loading && draws.length === 0 && (
            <div className="card text-center space-y-2">
              <div className="text-4xl">🍀</div>
              <h2 className="font-bold text-lg">{lang === "ml" ? "ഫലങ്ങൾ ഇതുവരെ ചേർത്തിട്ടില്ല" : "No results added yet"}</h2>
              <p className="muted text-sm">{lang === "ml" ? "ആദ്യത്തെ ഔദ്യോഗിക ഫലം ചേർത്താൽ ഇവിടെ കാണാം." : "Add the first official result and it will appear here."}</p>
            </div>
          )}
          {waiting && (
            <div className="card flex items-center gap-3" style={{ background: "var(--gold-soft)", borderColor: "transparent" }}>
              <span className="text-2xl">🕒</span>
              <div className="text-sm"><b>{lang === "ml" ? `ഇന്നത്തെ നറുക്കെടുപ്പ്: ${todays.ml}` : `Today's draw: ${todays.name}`}</b><br />
                <span className="muted">{lang === "ml" ? "ഉച്ചയ്ക്ക് 3:00 PM · താഴെ കാണുന്നത് കഴിഞ്ഞ ഫലം" : "3:00 PM · the result below is the previous draw"}</span></div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {recent.map((d, i) => <button key={d.id} className="chip whitespace-nowrap" data-on={i === sel} onClick={() => setSel(i)}>{dayName(d.date)} · {d.name}</button>)}
            </div>
          )}

          {draw && (
            <section className="hero space-y-3">
              <div className="relative z-10">
                <div className="text-xs font-bold tracking-wide opacity-90">{draw.date === today ? (lang === "ml" ? "ഇന്നത്തെ ഫലം" : "TODAY'S RESULT") : (lang === "ml" ? "കഴിഞ്ഞ ഫലം" : "PREVIOUS RESULT")}</div>
                <div className="text-sm opacity-90">{dateLabel} · {draw.drawNo}</div>
                <div className="text-2xl font-extrabold">{draw.name}</div>
              </div>
              <div className="prize-pill relative z-10">
                <div className="text-xs font-bold tracking-wide opacity-90">{t("first").toUpperCase()}</div>
                {!draw.prizes.first.length && <div className="text-2xl font-bold opacity-80">{lang === "ml" ? "പ്രഖ്യാപിക്കുന്നു…" : "Being announced…"}</div>}
                {draw.prizes.first.map((w) => (
                  <div key={w.ticket}>
                    <div className="mono text-4xl font-extrabold" style={{ color: "#fef08a" }}>{w.ticket}</div>
                    <div className="text-xs opacity-90">{w.district}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 relative z-10">
                {(["second", "third"] as const).map((k) => (
                  <div key={k} className="prize-pill">
                    <div className="text-[11px] font-bold tracking-wide opacity-90">{t(k).toUpperCase()}</div>
                    {draw.prizes[k].map((w) => <div key={w.ticket} className="mono text-lg font-bold">{w.ticket}</div>)}
                  </div>
                ))}
              </div>
              <div className="relative z-10 flex items-center gap-1.5 text-xs font-semibold opacity-95">
                {draw.verified ? <BadgeCheck size={15} /> : <Info size={15} />}{draw.verified ? t("verified") : draw.source === "consensus" ? t("consensus") : draw.source === "feed" ? t("feedNote") : t("unverified")}
              </div>
            </section>
          )}

          {draw && (
            <a className="btn btn-ghost w-full" target="_blank" rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`🍀 ${draw.name} ${draw.drawNo} (${draw.date})\n1st: ${draw.prizes.first[0]?.ticket}\n2nd: ${draw.prizes.second[0]?.ticket}\n3rd: ${draw.prizes.third[0]?.ticket}\n(Unofficial — verify with Govt. Gazette)`)}`}>
              💬 {lang === "ml" ? "WhatsApp-ൽ പങ്കിടുക" : "Share on WhatsApp"}
            </a>
          )}
          {draw && <div className="grid grid-cols-2 gap-2"><VoiceButton draw={draw} /><Link href="/search" className="btn"><ScanLine size={18} />{t("scan")}</Link></div>}

          <section className="grid grid-cols-3 gap-3">
            {TILES.map(({ href, I, en, ml }) => (
              <Link key={en} href={href} className="card tile"><span className="ico"><I size={26} /></span>{lang === "ml" ? ml : en}</Link>
            ))}
          </section>

          {draw && (
            <details className="card group">
              <summary className="flex items-center justify-between font-bold cursor-pointer list-none">
                {lang === "ml" ? "എല്ലാ സമ്മാനങ്ങളും" : "All prizes"} <ChevronDown size={20} className="group-open:rotate-180 transition" />
              </summary>
              <div className="mt-3 space-y-4">
                <DrawCard draw={draw} />
                <ShareImage filename={`${draw.id}.png`}><ResultPoster draw={draw} /></ShareImage>
              </div>
            </details>
          )}

          <AlertsCard />

          <section className="card">
            <h2 className="font-bold mb-2">{t("schedule")}</h2>
            <ul className="text-sm divide-y divide-[color:var(--line)]">
              {WEEKLY.map((l) => (
                <li key={l.code} className="flex justify-between py-1.5"><span className="muted">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][l.weekday!]}</span><span className="font-semibold">{lang === "ml" ? l.ml : l.name}</span></li>
              ))}
            </ul>
            <p className="muted text-xs mt-2">3:00 PM draw · official PDF ~4:30 PM</p>
          </section>
      </>
    </>
  );
}
