import { NextResponse } from "next/server";

// Only genuine browser push services may be stored: the server later POSTs to every endpoint,
// so an arbitrary URL here would let anyone make the server call internal or third-party hosts.
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];
function validEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
}
const short = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;

export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return NextResponse.json({ error: "Alerts need Supabase configured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sub = body?.sub, codes = body?.codes;
  if (!validEndpoint(sub?.endpoint) || !short(sub?.keys?.p256dh, 200) || !short(sub?.keys?.auth, 100)) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const clean = Array.isArray(codes) ? codes.filter((c: unknown) => typeof c === "string" && /^[A-Z]{2}$/.test(c as string)).slice(0, 14) : [];
  const { createClient } = await import("@supabase/supabase-js");
  // Store only the fields web-push needs, never extra client-supplied properties.
  const { error } = await createClient(url, key).from("push_subs").upsert({ endpoint: sub.endpoint, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, codes: clean });
  return error ? NextResponse.json({ error: "save failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => null);
  if (!validEndpoint(body?.endpoint)) return NextResponse.json({ error: "bad endpoint" }, { status: 400 });
  const { createClient } = await import("@supabase/supabase-js");
  await createClient(url, key).from("push_subs").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
