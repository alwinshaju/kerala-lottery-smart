"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Flame, Repeat, Hourglass, MapPin } from "lucide-react";
import { useApp } from "@/components/Providers";
import { cold, frequency, topDistricts } from "@/lib/analytics";

type Tab = "hot" | "repeat" | "overdue" | "places";

const TABS: { id: Tab; I: typeof Flame; en: string; ml: string }[] = [
  { id: "hot", I: Flame, en: "Hot", ml: "ഹോട്ട്" },
  { id: "repeat", I: Repeat, en: "Repeats", ml: "ആവർത്തനം" },
  { id: "overdue", I: Hourglass, en: "Not seen", ml: "വരാത്തത്" },
  { id: "places", I: MapPin, en: "Places", ml: "സ്ഥലങ്ങൾ" },
];

const HELP: Record<Tab, { en: string; ml: string }> = {
  hot: { en: "Numbers that came up most often recently. Tap a number to see where it won.", ml: "അടുത്തിടെ ഏറ്റവും കൂടുതൽ വന്ന നമ്പറുകൾ. ഒരു നമ്പറിൽ തൊട്ടാൽ എവിടെ അടിച്ചെന്ന് കാണാം." },
  repeat: { en: "Numbers that have won more than once in the period you pick.", ml: "തിരഞ്ഞെടുത്ത കാലയളവിൽ ഒന്നിലധികം തവണ വന്ന നമ്പറുകൾ." },
  overdue: { en: "4-digit numbers that haven't won for a while. This is for interest only: they are not more likely to come next.", ml: "കുറച്ചു കാലമായി വരാത്ത 4 അക്ക നമ്പറുകൾ. കൗതുകത്തിന് മാത്രം: ഇവ അടുത്തതായി വരാൻ കൂടുതൽ സാധ്യതയില്ല." },
  places: { en: "Districts where the 1st prize was sold most often.", ml: "ഒന്നാം സമ്മാനം ഏറ്റവും കൂടുതൽ വിറ്റ ജില്ലകൾ." },
};

const PERIODS = [["30 days", "30 ദിവസം", 30], ["90 days", "90 ദിവസം", 90], ["1 year", "1 വർഷം", 365], ["All", "എല്ലാം", null]] as const;

function Chips<T extends string | number | null>({ items, value, onChange }: { items: readonly (readonly [string, string, T])[]; value: T; onChange: (v: T) => void }) {
  const { lang } = useApp();
  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
      {items.map(([en, ml, v]) => <button key={en} className="chip whitespace-nowrap" data-on={value === v} onClick={() => onChange(v)}>{lang === "ml" ? ml : en}</button>)}
    </div>
  );
}

/** Ranked list with a bar so "more often" is visible at a glance; each number links to the Search page. */
function RankList({ rows }: { rows: { n: string; c: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.c));
  if (!rows.length) return <p className="muted text-sm py-3">Nothing to show for this period yet.</p>;
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.n}>
          <Link href={`/search?q=${r.n}`} className="flex items-center gap-3 rounded-2xl p-2 -mx-2 active:bg-[color:var(--brand-soft)]">
            <span className="w-6 text-center text-sm font-bold muted">{i + 1}</span>
            <span className="mono text-2xl font-extrabold w-20">{r.n}</span>
            <span className="flex-1 h-3 rounded-full" style={{ background: "var(--line)" }}>
              <span className="block h-3 rounded-full" style={{ width: `${(r.c / max) * 100}%`, background: "var(--brand)" }} />
            </span>
            <span className="text-base font-bold w-12 text-right">{r.c}×</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function AnalyticsPage() {
  const { draws, lang } = useApp();
  const ml = lang === "ml";
  const [tab, setTab] = useState<Tab>("hot");
  const [digits, setDigits] = useState<3 | 4>(4);
  const [period, setPeriod] = useState<number | null>(30);
  const [coldDays, setColdDays] = useState(90);
  const [placesDays, setPlacesDays] = useState<number | null>(90);
  const [more, setMore] = useState(false);

  const hot = useMemo(() => frequency(draws, period, digits).slice(0, 10), [draws, period, digits]);
  const rep = useMemo(() => frequency(draws, period, 4).filter((x) => x.c >= 2).slice(0, 12), [draws, period]);
  const cl = useMemo(() => cold(draws, coldDays), [draws, coldDays]);
  const places = useMemo(() => topDistricts(draws, placesDays), [draws, placesDays]);
  const maxP = Math.max(1, ...places.map((p) => p.wins));

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold">{ml ? "വിശകലനം" : "Number insights"}</h1>
        <p className="muted text-sm">{ml ? "ഓരോ വിഭാഗവും തിരഞ്ഞെടുക്കുക" : "Pick one view at a time"}</p>
      </div>

      {/* big segmented tabs */}
      <div className="grid grid-cols-4 gap-2" role="tablist">
        {TABS.map(({ id, I, en, ml: m }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-bold border"
            style={tab === id ? { background: "var(--brand)", color: "var(--on-brand)", borderColor: "var(--brand)" } : { background: "var(--card)", borderColor: "var(--line)" }}>
            <I size={22} />{ml ? m : en}
          </button>
        ))}
      </div>

      <p className="rounded-2xl p-3 text-sm" style={{ background: "var(--brand-soft)" }}>{HELP[tab][ml ? "ml" : "en"]}</p>

      {tab === "hot" && (
        <section className="card space-y-3">
          <div className="flex gap-2">
            {[4, 3].map((d) => <button key={d} className="chip" data-on={digits === d} onClick={() => setDigits(d as 3 | 4)}>{d}{ml ? " അക്കം" : "-digit"}</button>)}
          </div>
          <Chips items={PERIODS} value={period} onChange={setPeriod} />
          <RankList rows={hot} />
        </section>
      )}

      {tab === "repeat" && (
        <section className="card space-y-3">
          <Chips items={PERIODS} value={period} onChange={setPeriod} />
          <RankList rows={rep} />
        </section>
      )}

      {tab === "overdue" && (
        <section className="card space-y-3">
          <Chips items={[["90 days", "90 ദിവസം", 90], ["120 days", "120 ദിവസം", 120], ["180 days", "180 ദിവസം", 180]] as const} value={coldDays} onChange={setColdDays} />
          <p className="text-sm"><b>{cl.length.toLocaleString("en-IN")}</b> {ml ? `നമ്പറുകൾ ${coldDays} ദിവസമായി വന്നിട്ടില്ല` : `numbers haven't appeared in ${coldDays} days`}</p>
          <div className="flex flex-wrap gap-2">
            {cl.slice(0, more ? 200 : 40).map((n) => <Link key={n} href={`/search?q=${n}`} className="numchip">{n}</Link>)}
          </div>
          <button className="btn btn-ghost w-full" onClick={() => setMore(!more)}>{more ? (ml ? "കുറച്ച് കാണിക്കുക" : "Show fewer") : (ml ? "കൂടുതൽ കാണിക്കുക" : "Show more")}</button>
        </section>
      )}

      {tab === "places" && (
        <section className="card space-y-3">
          <Chips items={[["Last 90 days", "90 ദിവസം", 90], ["All time", "എല്ലാം", null]] as const} value={placesDays} onChange={setPlacesDays} />
          <ol className="space-y-3">
            {places.map((p, i) => (
              <li key={p.district}>
                <div className="flex justify-between font-bold"><span>{i + 1}. {p.district[0] + p.district.slice(1).toLowerCase()}</span><span>{p.wins}</span></div>
                <div className="h-3 rounded-full mt-1" style={{ background: "var(--line)" }}>
                  <div className="h-3 rounded-full" style={{ width: `${(p.wins / maxP) * 100}%`, background: "var(--brand)" }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-xs muted">{ml ? "ഓരോ നറുക്കെടുപ്പും സ്വതന്ത്രമാണ്. ഈ കണക്കുകൾ ഭാഗ്യം ഉറപ്പാക്കില്ല." : "Every draw is independent. These numbers describe the past; they can't predict the next draw."}</p>
    </>
  );
}
