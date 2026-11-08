/** Ticket number shown as individual digit tiles: odd digits green, even digits gold, so the shape of a number is visible at a glance. */
export function Digits({ ticket, size = "md" }: { ticket: string; size?: "sm" | "md" | "lg" }) {
  const m = ticket.trim().match(/^([A-Za-z]{2})?\s*(\d+)$/);
  const series = m?.[1]?.toUpperCase();
  const digits = m?.[2] ?? ticket;
  const scale = size === "lg" ? "scale-110 origin-left" : size === "sm" ? "scale-[.8] origin-left -mr-3" : "";
  return (
    <span className={`inline-flex items-center gap-1 ${scale}`} aria-label={ticket}>
      {series && <span className="mono font-black text-lg mr-1" style={{ color: "var(--ink)" }}>{series}</span>}
      {[...digits].map((d, i) => <span key={i} className={`dg ${Number(d) % 2 ? "o" : "e"}`}>{d}</span>)}
    </span>
  );
}
