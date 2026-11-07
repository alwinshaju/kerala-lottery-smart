"use client";
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

interface Row { name: string; ok: boolean; message: string; problems?: string[] }

export default function UploadPage() {
  const [pin, setPin] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { setPin(sessionStorage.getItem("adminPin") || ""); } catch {} }, []);

  async function send(files: FileList | null) {
    if (!files?.length || !pin) return;
    setBusy(true);
    try { sessionStorage.setItem("adminPin", pin); } catch {}
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append("file", f);
      try {
        const r = await fetch("/api/admin/upload", { method: "POST", headers: { "x-admin-pin": pin }, body: fd });
        const j = await r.json();
        setRows((x) => [{ name: f.name, ok: !!j.ok, message: j.message, problems: j.problems }, ...x]);
      } catch (e: any) { setRows((x) => [{ name: f.name, ok: false, message: String(e.message) }, ...x]); }
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold">Upload official PDF</h1>
      <p className="muted text-sm">Download the day's PDF from LOTIS, then pick it here. It is checked strictly and saved as <b>verified</b>.</p>
      <input className="input" type="password" inputMode="numeric" placeholder="Admin PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
      <label className={`btn w-full cursor-pointer ${!pin || busy ? "opacity-50" : ""}`}>
        <Upload size={18} />{busy ? "Checking…" : "Choose PDF(s)"}
        <input type="file" accept="application/pdf" multiple className="hidden" disabled={!pin || busy} onChange={(e) => { send(e.target.files); e.target.value = ""; }} />
      </label>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="card !p-3 text-sm" style={{ borderColor: r.ok ? "var(--brand)" : "var(--danger)" }}>
            <div className="font-bold">{r.ok ? "✓" : "✗"} {r.name}</div>
            <div>{r.message}</div>
            {r.problems?.map((p) => <div key={p} className="muted">• {p}</div>)}
          </li>
        ))}
      </ul>
    </div>
  );
}
