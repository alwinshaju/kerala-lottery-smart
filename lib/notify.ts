import * as webpush from "web-push";
import type { Draw } from "./types";

const summary = (d: Draw) => {
  const f = d.prizes.first[0];
  return `${d.name} ${d.drawNo} result is out. 1st prize: ${f?.ticket ?? "—"}${f?.district ? " (" + f.district + ")" : ""}`;
};

/** Free alert fan-out: web push to subscribers + one Telegram channel post. Never throws. */
export async function notifyNewDraw(d: Draw, opts: { unofficial?: boolean } = {}) {
  const out = { push: 0, pushRemoved: 0, telegram: false };
  const body = summary(d) + (opts.unofficial ? " (unofficial; official PDF pending)" : "");

  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subj, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (pub && priv && url && key) {
    try {
      webpush.setVapidDetails(subj || "mailto:admin@example.com", pub, priv);
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key);
      const { data } = await sb.from("push_subs").select("endpoint, sub, codes");
      const payload = JSON.stringify({ title: "Kerala Lottery Result", body, url: "/" });
      await Promise.all((data ?? []).filter((r: any) => !r.codes?.length || r.codes.includes(d.code)).map(async (r: any) => {
        try { await webpush.sendNotification(r.sub, payload); out.push++; }
        catch (e: any) {
          if (e.statusCode === 404 || e.statusCode === 410) { await sb.from("push_subs").delete().eq("endpoint", r.endpoint); out.pushRemoved++; }
        }
      }));
    } catch {}
  }

  const { TELEGRAM_BOT_TOKEN: tok, TELEGRAM_CHANNEL_ID: chat } = process.env;
  if (tok && chat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: `🍀 ${body}\n2nd: ${d.prizes.second[0]?.ticket ?? "—"}\n3rd: ${d.prizes.third[0]?.ticket ?? "—"}\nUnofficial summary; verify with the Govt. Gazette.` }),
      });
      out.telegram = r.ok;
    } catch {}
  }
  return out;
}
