"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X, ImagePlus } from "lucide-react";

/** Live barcode scan (html5-qrcode) + OCR of a photo (tesseract.js). Calls onFound with raw text; parsing happens upstream. */
export function Scanner({ onFound, onClose }: { onFound: (raw: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"barcode" | "ocr">("barcode");
  const [msg, setMsg] = useState("Point the camera at the ticket barcode");
  const scannerRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const secure = typeof window === "undefined" || window.isSecureContext;

  useEffect(() => {
    if (mode !== "barcode") return;
    if (!secure) { setMsg("Live camera needs a secure (https) link. Use Photo OCR, or open the https site."); return; }
    let stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const s = new Html5Qrcode("scan-region"); scannerRef.current = s;
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 260, height: 140 } },
          (text) => { if (!stopped) { stopped = true; s.stop().catch(() => {}); onFound(text); } }, () => {});
      } catch (e: any) { setMsg("Camera unavailable: " + (e?.message ?? e) + ". Use photo OCR or type the number."); }
    })();
    return () => { stopped = true; scannerRef.current?.stop?.().catch?.(() => {}); };
  }, [mode, onFound, secure]);

  /** Shrink + greyscale the photo first: full phone photos (12MP+) crash mobile browsers inside tesseract. */
  async function prepare(file: File): Promise<Blob> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const g = c.getContext("2d")!; g.filter = "grayscale(1) contrast(1.4)"; g.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return await new Promise((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error("image"))), "image/jpeg", 0.9));
  }

  async function ocr(file: File) {
    setBusy(true);
    try {
      // 1) The photo may contain the barcode/QR — exact, so try it first.
      setMsg("Looking for a barcode in the photo…");
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const t = await new Html5Qrcode("scan-file-holder", false).scanFile(file, false);
        if (t) { onFound(t); return; }
      } catch { /* no barcode — fall through to OCR */ }
      // 2) Read the printed number.
      setMsg("Reading the printed number… (first time may take ~20 s)");
      const img = await prepare(file);
      const { createWorker } = await import("tesseract.js");
      const w = await createWorker("eng");
      try {
        await w.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 " });
        const { data } = await w.recognize(img);
        const txt = data.text.toUpperCase();
        const m = txt.match(/\b([A-Z]{2})\s?(\d{6})\b/) ?? txt.match(/\b(\d{6})\b/);
        if (m) onFound(m[0]); else setMsg("Couldn't find a ticket number. Retake the photo closer and straight, or type it.");
      } finally { await w.terminate().catch(() => {}); }
    } catch (e: any) {
      setMsg("Couldn't read that photo (" + (e?.message ?? "error") + "). Retake it closer, or type the number.");
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button className="chip" data-on={mode === "barcode"} onClick={() => setMode("barcode")}><Camera size={12} className="inline" /> Barcode</button>
            <button className="chip" data-on={mode === "ocr"} onClick={() => setMode("ocr")}><ImagePlus size={12} className="inline" /> Photo OCR</button>
          </div>
          <button onClick={onClose} aria-label="close"><X /></button>
        </div>
        {mode === "barcode" ? <div id="scan-region" className="rounded-lg overflow-hidden min-h-48" /> : (
          <label className="btn btn-ghost w-full cursor-pointer">Take / choose photo
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) ocr(f); }} />
          </label>
        )}
        <div id="scan-file-holder" className="hidden" />
        <p className="text-sm muted">{busy ? "⏳ " : ""}{msg}</p>
      </div>
    </div>
  );
}
