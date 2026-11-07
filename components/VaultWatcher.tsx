"use client";
import { useEffect } from "react";
import { useApp } from "./Providers";
import { checkTicket, parseTicket } from "@/lib/ticket";
import { inr } from "@/lib/payout";

/** Free, on-device winner alert: when a result arrives, check the saved vault and notify once per ticket+draw. */
export function VaultWatcher() {
  const { draws } = useApp();
  useEffect(() => {
    if (!draws.length) return;
    try {
      const items: { ticket: string; date: string; code: string }[] = JSON.parse(localStorage.getItem("vault.v1") || "[]");
      const seen = new Set<string>(JSON.parse(localStorage.getItem("vault.notified") || "[]"));
      const fresh: string[] = [];
      for (const it of items) {
        const d = draws.find((x) => x.date === it.date && x.code === it.code); const t = parseTicket(it.ticket);
        if (!d || !t) continue;
        const k = `${it.ticket}|${d.id}`; if (seen.has(k)) continue;
        const w = checkTicket(d, t); seen.add(k);
        if (w.length) fresh.push(`${it.ticket} won ${inr(Math.max(...w.map((x) => x.amount)))}`);
      }
      localStorage.setItem("vault.notified", JSON.stringify([...seen]));
      if (fresh.length && "Notification" in window && Notification.permission === "granted")
        navigator.serviceWorker.ready.then((r) => r.showNotification("🎉 Your ticket won!", { body: fresh.join("\n"), icon: "/icon.svg", tag: "vault-win" }));
    } catch {}
  }, [draws]);
  return null;
}
