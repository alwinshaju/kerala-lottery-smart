/**
 * npm run ingest                          → compare the LOTIS listing with your database (read-only)
 * npm run ingest -- --dir=./pdfs          → ingest official PDFs you downloaded (strict validation)
 * npm run ingest -- --dir=./pdfs --watch  → keep running; each PDF dropped in the folder is ingested within ~10 s
 * flags: --limit=15  --dry (validate only)  --alert (Telegram the admin once when today's PDF is listed but missing)
 *
 * LOTIS gates each PDF behind a CAPTCHA, so this script never downloads PDFs itself.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, requireWriteEnv } from "../lib/env";
import { isoDate, nowIST } from "../lib/schedule";
loadEnv();
import { fetchListing, LOTIS_URL } from "../lib/scraper/lotisParser";
import { ingestPdfBuffer } from "../lib/ingestPdf";

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const has = (f: string) => process.argv.includes(`--${f}`);
const limit = +(arg("limit") ?? 15);
const dir = arg("dir");

async function existing(): Promise<Map<string, boolean>> {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await sb.from("draws").select("id, verified");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r: any) => [r.id, r.verified]));
}

async function alertToday(rows: Awaited<ReturnType<typeof fetchListing>>, have: Map<string, boolean>) {
  const { TELEGRAM_BOT_TOKEN: tok, TELEGRAM_ADMIN_CHAT_ID: chat } = process.env;
  const r = rows.find((x) => x.date === isoDate(nowIST()) && !have.get(`${x.code}-${x.date}`));
  if (!r || !tok || !chat) return;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const key = `alerted:${r.drawNo}:${r.date}`;
  const { data, error } = await sb.from("sync_state").select("key").eq("key", key).maybeSingle();
  if (!error && data) return;
  await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: `Official PDF for ${r.drawNo} (${r.date}) is on LOTIS. Download it and forward it to this bot (or upload at /admin/upload).` }) }).catch(() => {});
  if (!error) await sb.from("sync_state").upsert({ key, value: new Date().toISOString() });
  console.log(`Alert sent for ${r.drawNo}.`);
}

(async () => {
  requireWriteEnv();
  const rows = (await fetchListing()).slice(0, limit);
  console.log(`LOTIS listing: ${rows.length} newest draws read.`);
  const have = await existing();

  if (!dir) {
    for (const r of rows) console.log(`${have.get(`${r.code}-${r.date}`) ? "✓ official " : have.has(`${r.code}-${r.date}`) ? "~ unofficial" : "✗ MISSING   "}  ${r.drawNo.padEnd(8)} ${r.date}  ${r.name}`);
    if (has("alert")) await alertToday(rows, have);
    const miss = rows.filter((r) => !have.get(`${r.code}-${r.date}`));
    if (miss.length) console.log(`\n${miss.length} without an official PDF. Download from ${LOTIS_URL} (solve the equation) into a folder, then:\n  npm run ingest -- --dir=./pdfs`);
    return;
  }

  const done = new Set<string>();
  const pass = async () => {
    let ok = 0;
    for (const f of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf") && !done.has(f))) {
      let buf: Buffer;
      try { buf = readFileSync(join(dir, f)); } catch { continue; }
      const r = await ingestPdfBuffer(buf, { rows, dry: has("dry") });
      done.add(f);
      console.log(`${r.ok ? "✓" : "✗"} ${f}: ${r.message}${r.problems?.length ? "\n   - " + r.problems.join("\n   - ") : ""}`);
      if (r.ok) ok++;
    }
    return ok;
  };
  console.log(`${await pass()} PDF(s) accepted. Compare the first few with the printed PDFs.`);
  if (has("watch")) { console.log(`Watching ${dir}… Ctrl+C to stop.`); for (;;) { await new Promise((r) => setTimeout(r, 10000)); await pass(); } }
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
