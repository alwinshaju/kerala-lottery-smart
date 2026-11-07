import type { Draw } from "@/lib/types";

/** Fixed-size, high-contrast card used for sharing (and agent posters when `shop` is set). */
export function ResultPoster({ draw, shop }: { draw: Draw; shop?: string }) {
  const p = draw.prizes;
  return (
    <div style={{ width: "100%", background: "linear-gradient(160deg,#0f766e,#064e3b)", color: "#fff", padding: 20, borderRadius: 16, fontFamily: "system-ui" }}>
      <div style={{ fontSize: 13, opacity: .85 }}>KERALA STATE LOTTERY RESULT</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{draw.name} · {draw.drawNo}</div>
      <div style={{ fontSize: 13, opacity: .85, marginBottom: 12 }}>{draw.date.split("-").reverse().join("-")} · 3:00 PM</div>
      {(["first", "second", "third"] as const).map((k, i) => (
        <div key={k} style={{ background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "8px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, opacity: .8 }}>{["1ST PRIZE", "2ND PRIZE", "3RD PRIZE"][i]}</div>
          {p[k].map((w) => (
            <div key={w.ticket} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontWeight: 800, fontSize: i === 0 ? 30 : 22, color: "#fde68a" }}>
              {w.ticket} <span style={{ fontSize: 11, color: "#fff", fontWeight: 400 }}>{w.district}</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize: 11, opacity: .8 }}>CONSOLATION</div>
      <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13, lineHeight: 1.5 }}>{p.consolation.map((w) => w.ticket).join("  ")}</div>
      <div style={{ marginTop: 12, fontSize: 10, opacity: .7 }}>Unofficial. Verify with the Govt. Gazette / statelottery.kerala.gov.in</div>
      {shop && <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.35)", fontSize: 16, fontWeight: 700, textAlign: "center" }}>🍀 {shop}</div>}
    </div>
  );
}
