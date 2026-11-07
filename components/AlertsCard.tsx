"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useApp } from "./Providers";
import { WEEKLY } from "@/lib/schedule";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export function AlertsCard() {
  const { lang } = useApp();
  const ml = lang === "ml";
  const [state, setState] = useState<"unsupported" | "ios-install" | "off" | "on" | "denied">("off");
  const [codes, setCodes] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ios = /iphone|ipad/i.test(navigator.userAgent), standalone = (navigator as any).standalone || matchMedia("(display-mode: standalone)").matches;
    if (ios && !standalone) return setState("ios-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => {});
    try { setCodes(JSON.parse(localStorage.getItem("alertCodes") || "[]")); } catch {}
  }, []);

  async function enable() {
    setMsg("");
    try {
      if (!vapid) return setMsg("Alerts aren't configured on this server yet.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub, codes }) });
      if (!r.ok) throw new Error((await r.json()).error);
      setState("on");
    } catch (e: any) { setMsg(String(e?.message ?? e)); }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    setState("off");
  }
  const toggle = (c: string) => { const n = codes.includes(c) ? codes.filter((x) => x !== c) : [...codes, c]; setCodes(n); try { localStorage.setItem("alertCodes", JSON.stringify(n)); } catch {} };

  return (
    <section className="card space-y-2">
      <h2 className="font-bold flex items-center gap-2"><Bell size={18} />{ml ? "ഫല അറിയിപ്പ്" : "Result alerts"}</h2>
      {state === "ios-install" && <p className="text-sm muted">{ml ? "iPhone-ൽ: Share → “Add to Home Screen” ചെയ്ത ശേഷം അറിയിപ്പ് ഓണാക്കാം." : "On iPhone: tap Share → “Add to Home Screen”, then open the app from there to turn on alerts."}</p>}
      {state === "unsupported" && <p className="text-sm muted">{ml ? "ഈ ബ്രൗസറിൽ അറിയിപ്പ് ലഭ്യമല്ല." : "This browser doesn't support alerts."}</p>}
      {state === "denied" && <p className="text-sm muted">{ml ? "അറിയിപ്പ് തടഞ്ഞിരിക്കുന്നു. ബ്രൗസർ സെറ്റിങ്സിൽ അനുവദിക്കുക." : "Notifications are blocked. Allow them in browser settings."}</p>}
      {(state === "off" || state === "on") && (
        <>
          <p className="text-sm muted">{ml ? "ഫലം വരുമ്പോൾ അറിയിക്കും. തിരഞ്ഞെടുക്കാത്തപക്ഷം എല്ലാ ലോട്ടറിയും." : "Get notified when a result is out. Pick lotteries, or leave empty for all."}</p>
          <div className="flex flex-wrap gap-2">{WEEKLY.map((l) => <button key={l.code} className="chip" data-on={codes.includes(l.code)} onClick={() => toggle(l.code)} disabled={state === "on"}>{l.name}</button>)}</div>
          {state === "off" ? <button className="btn w-full" onClick={enable}><Bell size={18} />{ml ? "അറിയിപ്പ് ഓൺ" : "Turn on alerts"}</button>
            : <button className="btn btn-ghost w-full" onClick={disable}><BellOff size={18} />{ml ? "ഓഫ് ചെയ്യുക" : "Turn off alerts"}</button>}
        </>
      )}
      {msg && <p className="text-sm" style={{ color: "var(--danger)" }}>{msg}</p>}
      {process.env.NEXT_PUBLIC_TELEGRAM_URL && <a className="btn btn-ghost w-full" href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noreferrer">✈️ Telegram channel</a>}
    </section>
  );
}
