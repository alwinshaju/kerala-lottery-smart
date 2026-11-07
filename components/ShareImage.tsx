"use client";
import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { useApp } from "./Providers";

/** Renders `children` as a branded card; the button converts it to PNG and shares (WhatsApp/Telegram via Web Share) or downloads. */
export function ShareImage({ children, filename = "result.png", label }: { children: React.ReactNode; filename?: string; label?: string }) {
  const { t } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!ref.current) return; setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: filename });
      else { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <div ref={ref}>{children}</div>
      <button className="btn w-full" disabled={busy} onClick={go}><Share2 size={16} />{busy ? "…" : label ?? t("share")}</button>
    </div>
  );
}
