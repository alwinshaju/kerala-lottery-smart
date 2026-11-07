"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { dict, Key, Lang } from "@/lib/i18n";
import type { Draw, ResultsPayload } from "@/lib/types";
import { rowToDraw } from "@/lib/rowMap";

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; dark: boolean; toggleDark: () => void; big: boolean; toggleBig: () => void;
  draws: Draw[]; source: string; loading: boolean; refresh: (v?: string) => void }
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>("en");
  const [dark, setDark] = useState(false);
  const [big, setBig] = useState(false);
  const [payload, setPayload] = useState<ResultsPayload | null>(null);

  useEffect(() => {
    try {
      const l = localStorage.getItem("lang") as Lang | null; if (l) setLangS(l);
      const d = localStorage.getItem("dark"); const isDark = d ? d === "1" : matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(isDark); setBig(localStorage.getItem("big") === "1");
    } catch {}
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.documentElement.classList.toggle("big", big); }, [big]);

  const refresh = useCallback((v?: string) => {
    // `v` (a row's updated_at) is a cache-version: every client asks for the same URL, so the CDN builds it once.
    fetch(v ? `/api/results?v=${encodeURIComponent(v)}` : "/api/results").then((r) => r.json()).then(setPayload).catch(() => {});
  }, []);

  // Realtime is opt-in (Supabase free tier = 200 concurrent connections).
  const realtimeOn = process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true" && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    refresh();
    // Results change once a day, so a relaxed poll (matches the 120 s edge cache) is enough.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { refresh(); timer = setTimeout(tick, 120000); };
    timer = setTimeout(tick, 120000);

    let cleanup = () => {};
    if (realtimeOn) {
      import("@supabase/supabase-js").then(({ createClient }) => {
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const ch = sb.channel("draws-live").on("postgres_changes", { event: "*", schema: "public", table: "draws" }, (evt: any) => {
          if (evt.eventType === "DELETE") return refresh();
          const d = rowToDraw(evt.new);
          if (d) { // apply the row directly: zero refetch lag, no extra DB hit
            setPayload((p) => {
              const rest = (p?.draws ?? []).filter((x) => x.id !== d.id);
              return { draws: [d, ...rest].sort((a, b) => b.date.localeCompare(a.date)), source: "supabase", updatedAt: new Date().toISOString() };
            });
          } else refresh(evt.new?.updated_at); // unexpected shape: versioned refetch, CDN-shared
        }).subscribe();
        cleanup = () => { sb.removeChannel(ch); };
      }).catch(() => {});
    }
    return () => { clearTimeout(timer); cleanup(); };
  }, [refresh, realtimeOn]);

  const value: Ctx = {
    lang, setLang: (l) => { setLangS(l); try { localStorage.setItem("lang", l); } catch {} },
    t: (k) => dict[lang][k] ?? dict.en[k],
    dark, toggleDark: () => setDark((v) => { try { localStorage.setItem("dark", v ? "0" : "1"); } catch {} return !v; }),
    big, toggleBig: () => setBig((v) => { try { localStorage.setItem("big", v ? "0" : "1"); } catch {} return !v; }),
    draws: payload?.draws ?? [], source: payload?.source ?? "", loading: !payload, refresh,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
