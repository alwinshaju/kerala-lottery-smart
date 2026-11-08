/**
 * npm run consensus                    → today's draw (only after 4:25 PM IST): fetch two public sources, save ONLY if identical
 * npm run consensus -- --backtest      → compare both sources against the OFFICIAL rows already in your database (no writes)
 * flags: --force (ignore the 4:25 PM gate)  --dry
 * Rule: feed (keralalotteries.net) must pass strict validation. Second site agrees → source=consensus; second missing/incomplete → source=feed; second complete but different → source=feed, no public alert, admin warned. All rows are verified=false. The official PDF later replaces them (and any difference is reported).
 */
import { loadEnv, requireWriteEnv } from "../lib/env";
loadEnv();
import { fetchListing } from "../lib/scraper/lotisParser";
import { ALL_SOURCES } from "../lib/consensus/sources";
import { runConsensus } from "../lib/consensus";
import { diffPrizes } from "../lib/samePrizes";
import { rowToDraw } from "../lib/rowMap";
import { saveDraw } from "../lib/store";
import { notifyNewDraw } from "../lib/notify";
import { isoDate, nowIST, pdfOverdue } from "../lib/schedule";

async function adminMsg(text: string) {
  const { TELEGRAM_BOT_TOKEN: tok, TELEGRAM_ADMIN_CHAT_ID: chat } = process.env;
  if (tok && chat) await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text }) }).catch(() => {});
}
const has = (f: string) => process.argv.includes(`--${f}`);

async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function backtest() {
  const sb = await client();
  const { data } = await sb.from("draws").select("*").eq("verified", true).order("date", { ascending: false });
  const official = (data ?? []).map(rowToDraw).filter(Boolean) as NonNullable<ReturnType<typeof rowToDraw>>[];
  console.log(`Backtest against ${official.length} official rows.`);
  const wanted = official.map((d) => ({ code: d.code, drawNo: d.drawNo, date: d.date }));
  const stats: Record<string, { found: number; exact: number }> = {};
  for (const src of ALL_SOURCES) {
    const m = await src.load(wanted).catch((e) => { console.error(src.name, e.message); return new Map(); });
    stats[src.name] = { found: 0, exact: 0 };
    for (const o of official) {
      const d = m.get(`${o.code}-${o.date}`);
      if (!d) { console.log(`  ${src.name}: ${o.drawNo} not found`); continue; }
      stats[src.name].found++;
      const diff = diffPrizes(o, d);
      if (!diff.length) stats[src.name].exact++; else console.log(`  ${src.name}: ${o.drawNo} DIFFERS from official → ${diff.join("; ")}`);
    }
  }
  console.log("\nSource accuracy vs official PDFs:"); console.table(stats);
  const res = await runConsensus(ALL_SOURCES, wanted);
  const by = (k: string) => res.filter((r) => r.verdict.source === k).length;
  const saved = res.filter((r) => r.verdict.ok);
  const wrong = saved.filter((r) => diffPrizes(official.find((o) => o.id === `${r.code}-${r.date}`)!, r.verdict.draw!).length);
  console.log(`\nNew rule on ${res.length} draws: saved ${saved.length} (consensus ${by("consensus")}, feed-only ${by("feed")}), not saved ${res.length - saved.length}; saved rows that DIFFER from the official PDF: ${wrong.length}.`);
  for (const r of res) console.log(`  ${r.verdict.ok ? "✓" : "✗"} ${r.drawNo.padEnd(7)} ${String(r.verdict.source ?? "-").padEnd(9)} secondary=${r.verdict.secondary ?? "-"}${r.verdict.reasons[0] ? "  · " + r.verdict.reasons[0].slice(0, 110) : ""}`);
}

/** Tell the admin ONCE, and only when the automation failed and it is past 4:45 PM IST. */
async function failureAlert(sb: Awaited<ReturnType<typeof client>>, drawNo: string, date: string, why: string) {
  const t = nowIST();
  if (t.getHours() * 60 + t.getMinutes() < 16 * 60 + 45) return;
  const key = `fail-alert:${drawNo}:${date}`;
  const { data, error } = await sb.from("sync_state").select("key").eq("key", key).maybeSingle();
  if (!error && data) return;
  await adminMsg(`❗ Automatic result for ${drawNo} (${date}) FAILED validation. Please download the official PDF from LOTIS and upload it at /admin/upload (or forward it to this bot).\nReason: ${why.slice(0, 400)}`);
  if (!error) await sb.from("sync_state").upsert({ key, value: new Date().toISOString() });
}

async function today() {
  const now = nowIST(), date = isoDate(now);
  if (!has("force") && !pdfOverdue()) return console.log("Before 4:25 PM IST: the post-draw result tables are not final yet. (Use --force to override.)");
  const rows = await fetchListing().catch(() => []);
  const sb = await client();
  const { data: have } = await sb.from("draws").select("id,source,verified").like("id", `%-${date}`);
  // Already official or two-source consensus → done. A feed-only row is retried so it can be upgraded when the 2nd source catches up.
  if (have?.length && (have[0].verified || have[0].source === "consensus")) return console.log(`Today's draw (${date}) is already stored (${have[0].source}). Nothing to do.`);
  const stored = !!have?.length;
  // Draw number comes from the LOTIS listing if present, otherwise from the newest stored draw of today's lottery + 1.
  const { lotteryForWeekday, lotteryByCode } = await import("../lib/schedule");
  const listingToday = rows.find((r) => r.date === date);
  const lot = (listingToday?.code ? lotteryByCode(listingToday.code) : null) || lotteryForWeekday(now.getDay());
  let drawNo = listingToday?.drawNo;
  if (!drawNo) {
    const { data: last } = await sb.from("draws").select("draw_no").eq("code", lot.code).order("date", { ascending: false }).limit(1);
    const n = last?.[0]?.draw_no?.match(/-(\d+)$/)?.[1];
    if (!n) return console.log(`No previous ${lot.code} draw stored, cannot infer today's draw number.`);
    drawNo = `${lot.code}-${+n + 1}`;
  }
  const [r] = await runConsensus(ALL_SOURCES, [{ code: lot.code, drawNo, date }]);
  const v = r.verdict;
  if (!v.ok) {
    console.log(`✗ ${drawNo} NOT saved. The primary source failed strict validation:\n  - ${v.reasons.join("\n  - ")}`);
    await failureAlert(sb, drawNo, date, v.reasons.join("; "));
    return;
  }
  console.log(`${drawNo}: source=${v.source}, secondary=${v.secondary}${v.reasons[0] ? "\n  note: " + v.reasons[0].slice(0, 300) : ""}`);
  if (has("dry")) return console.log("(dry run, nothing saved)");
  const res = await saveDraw(v.draw!, v.source!);
  // Public alerts only when nothing contradicts the feed. A conflict goes to the admin only.
  if (!stored && res.alert && v.secondary !== "conflict") await notifyNewDraw(v.draw!, { unofficial: true });
  if (v.secondary === "conflict") await adminMsg(`⚠️ ${drawNo}: the two public sources DISAGREE. Saved the feed's version as UNOFFICIAL without public alerts. Please verify and upload the official PDF.\n${v.reasons[0].slice(0, 500)}`);
  console.log(`✓ ${drawNo} saved as UNOFFICIAL (${v.source}). Public alert sent: ${res.alert && v.secondary !== "conflict"}. The official PDF will replace it.`);
}

(async () => { requireWriteEnv(); await (has("backtest") ? backtest() : today()); })().catch((e) => { console.error(e.message ?? e); process.exit(1); });
