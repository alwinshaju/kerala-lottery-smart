# Kerala Lottery Hub

Next.js 16 (App Router, TS) + Tailwind v4 PWA. Independent informational tool — not affiliated with the Govt. of Kerala.

```bash
npm run dev          # http://localhost:3000
npm run scrape       # prints the live LOTIS listing (draw no, date)
```

## Data (official results only)
- Source: LOTIS `https://www.lotteryagent.kerala.gov.in/result/public/`. No live numbers, no third-party scraping.
- **LOTIS puts a CAPTCHA in front of every PDF**, which this project does not bypass. So the PDF step is one manual click per draw; everything after it is automatic:
  1. `npm run ingest` → lists the 15 newest LOTIS draws and which are missing from Supabase (read-only).
  2. Download the PDF(s) into `./pdfs` (solve the equation yourself).
  3. `npm run ingest -- --dir=./pdfs` (or add `--watch` to keep running; each dropped PDF is ingested within ~10 s and alerts are sent).
- **Strict validation** (`validateDraw` in `lib/scraper/lotisParser.ts`, also enforced inside `saveDraw`): exactly one 1st and 2nd prize with district, valid `XX 123456` tickets, 4th–8th tiers non-empty and 4-digit, no duplicates, lottery/weekday match, not a future date. Anything failing is rejected with reasons and never stored.
- The text parser is tested on samples only: **check the first few real PDFs against the printed output.**
- GitHub Action `lotis-official-sync.yml` (4:00–5:30 PM IST every 5 min + 6:30 PM backup): ingests PDFs committed to `./pdfs` and Telegram-alerts the admin once when today's PDF is listed. Secrets needed are in the file. Run the `sync_state` block of `schema.sql` first.
- `/api/results` is cached `s-maxage=120, stale-while-revalidate=600`; the home page shows "Awaiting Official Government Gazette PDF" from 3:00 PM until today's draw is stored.

## Notes
- `lib/payout.ts` holds typical prize amounts used by the ticket checker; parsed draws can carry their own `amounts`. The personal ledger lives at `/ledger` (device-only).
- Smart picks / number generator are statistical filters, not predictions; the UI says so.

## Free alerts
- **Web push:** `npx web-push generate-vapid-keys` → set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; run the `push_subs` block in `supabase/schema.sql`. iPhone users must "Add to Home Screen" first.
- **Telegram:** create a bot with @BotFather, make it admin of your channel, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `NEXT_PUBLIC_TELEGRAM_URL`.
- Alerts fire once, when a draw first becomes verified (`saveDraw` → `notifyNewDraw`), from `/api/admin/ingest` or `/api/cron/scrape`. Untested against live Supabase/Telegram.
- On-device: winner notification for vault tickets (`VaultWatcher`), offline cache of `/api/results`, A+ large text, monthly spending limit.

## Dual-guard ingestion
1. **Official override (verified):** forward the LOTIS PDF to your Telegram bot (`/api/telegram/webhook`, only your `TELEGRAM_ADMIN_CHAT_ID` is obeyed; set `TELEGRAM_WEBHOOK_SECRET`, then `npm run telegram:webhook -- --url=https://your-domain`, needs public HTTPS), or upload it at `/admin/upload` (ADMIN_PIN), or `npm run ingest -- --dir=./pdfs`. All use the same strict validator and are saved as `source=official_pdf, verified=true`.
2. **Hands-free consensus (unofficial):** `npm run consensus` (after 4:25 PM IST; the GitHub Action runs it). Saves only if keralalotteries.net (public feed) and kerala-lottery.net return IDENTICAL 1st/2nd/3rd, consolation and all 4-digit tiers and every source passes validation. Saved as `source=consensus, verified=false`; the UI says "Matched on 2 public sources · awaiting official PDF". The official PDF later replaces it and any difference is reported.
- `npm run consensus -- --backtest` scores the sources against your official rows. Last run: feed 10/10 exact, kerala-lottery.net 6/10, consensus passed 5/10 with 0 wrong. Agreement is not proof: both sites can share an upstream error, which is why these rows are never marked official.
- Run the `source` column block in `supabase/schema.sql` first. Check each site's terms (kerala-lottery.net restricts reproducing its content).
