import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ingestPdfBuffer } from "@/lib/ingestPdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const tg = (m: string, body: object) => fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reply = (chat: number | string, text: string) => tg("sendMessage", { chat_id: chat, text: text.slice(0, 3500) }).catch(() => {});

/** Forward an official LOTIS PDF to your bot: it is checked and saved as VERIFIED. Only the admin chat is obeyed. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "", token = process.env.TELEGRAM_BOT_TOKEN, admin = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!secret || !token || !admin) return new NextResponse("not configured", { status: 503 });
  const a = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? ""), b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("unauthorized", { status: 401 });

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg || String(msg.chat?.id) !== String(admin)) return NextResponse.json({ ok: true }); // ignore everyone else silently
  const doc = msg.document;
  if (!doc) { await reply(msg.chat.id, "Send me the official LOTIS result PDF as a file."); return NextResponse.json({ ok: true }); }
  if (doc.mime_type !== "application/pdf" || (doc.file_size ?? 0) > 8_000_000) { await reply(msg.chat.id, "That is not a PDF under 8 MB."); return NextResponse.json({ ok: true }); }

  try {
    const info = await (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(doc.file_id)}`)).json();
    if (!info.ok) throw new Error("Telegram getFile failed");
    const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`)).arrayBuffer());
    const r = await ingestPdfBuffer(buf);
    await reply(msg.chat.id, [r.message, ...(r.problems ?? []).map((p) => "• " + p)].join("\n"));
  } catch (e: any) { await reply(msg.chat.id, "Error: " + e.message); }
  return NextResponse.json({ ok: true });
}
