"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Sparkles, Wallet, BarChart3, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { VaultWatcher } from "./VaultWatcher";

const NAV = [
  { href: "/", k: "home", I: Home }, { href: "/analytics", k: "analytics", I: BarChart3 }, { href: "/search", k: "search", I: ScanLine },
  { href: "/predict", k: "predict", I: Sparkles }, { href: "/vault", k: "vault", I: Wallet },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, dark, toggleDark, source, big, toggleBig } = useApp();
  const path = usePathname();
  const [ack, setAck] = useState(true);
  useEffect(() => { try { setAck(localStorage.getItem("ack") === "1"); } catch { setAck(false); } }, []);

  return (
    <div className="min-h-dvh pb-44">
      <VaultWatcher />
      <header className="sticky top-0 z-30 bg-[color:var(--bg)]/90 backdrop-blur">
        <div className="mx-auto max-w-md px-3 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-base whitespace-nowrap min-w-0" style={{ color: "var(--brand-d)" }}>
            <span className="grid place-items-center w-8 h-8 shrink-0 rounded-xl text-white" style={{ background: "var(--brand)" }}>🍀</span>
            <span className="dark:text-[color:var(--brand)]">{t("appName")}</span>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="chip !font-bold !px-2.5" onClick={() => setLang(lang === "en" ? "ml" : "en")}>{t("language")}</button>
            <button className="chip !px-2.5 !font-extrabold" data-on={big} onClick={toggleBig} aria-label="large text">A+</button>
            <button className="chip !px-2.5" onClick={toggleDark} aria-label="theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </div>
      </header>
      {source === "demo" && <div className="mx-4 rounded-xl bg-amber-100 text-amber-900 text-xs text-center px-3 py-2 font-semibold">{t("demo")}</div>}
      <main className="mx-auto max-w-md px-4 py-2 space-y-4">{children}</main>
      <footer className="mx-auto max-w-md px-4 pb-6 text-[11px] leading-snug muted">{t("disclaimer")}</footer>
      <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md mx-3 sm:mx-auto mb-3 rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] shadow-[0_8px_30px_rgba(0,0,0,.12)] grid grid-cols-5 items-end px-1">
          {NAV.map(({ href, k, I }, i) => {
            const on = href === "/" ? path === "/" : path.startsWith(href);
            if (i === 2) return (
              <Link key={href} href={href} className="flex flex-col items-center -mt-6 pb-1.5 text-[11px] font-bold" style={{ color: "var(--brand-d)" }}>
                <span className="grid place-items-center w-14 h-14 rounded-full text-white shadow-lg" style={{ background: "var(--brand)", border: "4px solid var(--bg)" }}><I size={26} /></span>
                {t(k)}
              </Link>
            );
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold whitespace-nowrap" style={{ color: on ? "var(--brand)" : "var(--mute)" }}>
                <I size={23} strokeWidth={on ? 2.6 : 2} />{t(k)}
              </Link>
            );
          })}
        </div>
      </nav>
      {!ack && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="card max-w-md space-y-3">
            <p className="text-sm">{t("disclaimer")}</p>
            <button className="btn w-full" onClick={() => { try { localStorage.setItem("ack", "1"); } catch {} setAck(true); }}>{t("accept")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
