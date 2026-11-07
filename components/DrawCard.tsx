"use client";
import { BadgeCheck, Download } from "lucide-react";
import { useApp } from "./Providers";
import { afterDrawTime, pdfOverdue } from "@/lib/schedule";
import type { Draw } from "@/lib/types";
import { useEffect, useState } from "react";

/** Shown from 3:00 PM IST until today's official result is in the database. */
export function AwaitingBanner({ latestIsToday }: { latestIsToday: boolean }) {
  const { lang } = useApp();
  const [state, setState] = useState<"hide" | "wait" | "late">("hide");
  useEffect(() => { const f = () => setState(!afterDrawTime() ? "hide" : pdfOverdue() ? "late" : "wait"); f(); const id = setInterval(f, 30000); return () => clearInterval(id); }, []);
  if (latestIsToday || state === "hide") return null;
  return (
    <div className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "var(--gold-soft)", color: "var(--ink)" }}>
      🕓 {lang === "ml"
        ? "ഔദ്യോഗിക സർക്കാർ ഗസറ്റ് PDF-നായി കാത്തിരിക്കുന്നു (സാധാരണ വൈകിട്ട് 4:20 PM ഓടെ പ്രസിദ്ധീകരിക്കും — 100% കൃത്യതയ്ക്കായി)."
        : "Awaiting Official Government Gazette PDF (Published daily around 4:20 PM IST for 100% accuracy)."}
      {state === "late" && <div className="font-normal muted mt-1">{lang === "ml" ? "പതിവിലും വൈകുന്നു. ഉടൻ പ്രതീക്ഷിക്കാം." : "Taking longer than usual. It will appear here as soon as it is published."}</div>}
    </div>
  );
}

const Num = ({ s, big }: { s: string; big?: boolean }) => <span className={big ? "mono font-extrabold text-3xl" : "numchip"}>{s}</span>;

export function DrawCard({ draw, compact }: { draw: Draw; compact?: boolean }) {
  const { t } = useApp();
  const p = draw.prizes;
  return (
    <div className="card space-y-3" style={{ background: "var(--card)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-lg">{draw.name} <span className="muted text-sm">({draw.drawNo})</span></div>
          <div className="muted text-sm">{new Date(draw.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        {draw.verified
          ? <span className="chip flex items-center gap-1 !text-[11px] text-left" style={{ color: "var(--brand-d)", background: "var(--brand-soft)", borderColor: "transparent" }}><BadgeCheck size={14} className="shrink-0" />{t("verified")}</span>
          : <span className="chip !text-[11px]">{draw.source === "consensus" ? t("consensus") : draw.source === "feed" ? t("feedNote") : t("unverified")}</span>}
      </div>
      {([["first", t("first")], ["second", t("second")], ["third", t("third")]] as const).map(([k, label]) => (
        <div key={k}>
          <div className="text-xs font-bold uppercase tracking-wide muted mb-1">{label}</div>
          {p[k].map((w) => <div key={w.ticket}><Num s={w.ticket} big={k === "first"} /> <span className="muted text-xs">{w.district}</span></div>)}
        </div>
      ))}
      <div>
        <div className="text-xs uppercase muted">{t("consolation")}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">{p.consolation.map((w) => <Num key={w.ticket} s={w.ticket} />)}</div>
      </div>
      {!compact && (["fourth", "fifth", "sixth", "seventh", "eighth", "ninth"] as const).map((k) => (
        <div key={k}>
          <div className="text-xs uppercase muted">{k} prize</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">{p[k].map((n) => <Num key={n} s={n} />)}</div>
        </div>
      ))}
      {draw.pdfUrl && <a className="btn btn-ghost" href={draw.pdfUrl} target="_blank" rel="noreferrer"><Download size={16} />{t("downloadPdf")}</a>}
    </div>
  );
}
