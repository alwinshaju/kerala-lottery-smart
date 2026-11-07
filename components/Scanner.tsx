"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X, ImagePlus } from "lucide-react";

/** Live barcode scan (html5-qrcode) + OCR of a photo (tesseract.js). Calls onFound with raw text; parsing happens upstream. */
export function Scanner({ onFound, onClose }: { onFound: (raw: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"barcode" | "ocr">("barcode");
  const [msg, setMsg] = useState("Point the camera at the ticket barcode");
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (mode !== "barcode") return;
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
  }, [mode, onFound]);

  async function ocr(file: File) {
    setMsg("Reading the printed number…");
    const { createWorker } = await import("tesseract.js");
    const w = await createWorker("eng");
    await w.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 " });
    const { data } = await w.recognize(file); await w.terminate();
    const m = data.text.toUpperCase().match(/\b([A-Z]{2})\s?(\d{6})\b/) ?? data.text.match(/\b(\d{6})\b/);
    if (m) onFound(m[0]); else setMsg("Couldn't find a ticket number. Retake the photo closer, or type it.");
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
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && ocr(e.target.files[0])} />
          </label>
        )}
        <p className="text-sm muted">{msg}</p>
      </div>
    </div>
  );
}
