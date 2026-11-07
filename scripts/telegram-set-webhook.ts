/** npm run telegram:webhook -- --url=https://your-domain.com   (needs a public HTTPS URL; not possible on localhost) */
import { loadEnv } from "../lib/env";
loadEnv();
const url = process.argv.find((a) => a.startsWith("--url="))?.slice(6);
const { TELEGRAM_BOT_TOKEN: tok, TELEGRAM_WEBHOOK_SECRET: secret } = process.env;
if (!url || !url.startsWith("https://") || !tok || !secret) { console.error("Need --url=https://…, TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET (any long random string) in .env.local"); process.exit(1); }
fetch(`https://api.telegram.org/bot${tok}/setWebhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: `${url.replace(/\/$/, "")}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }) })
  .then((r) => r.json()).then((j) => console.log(j));
