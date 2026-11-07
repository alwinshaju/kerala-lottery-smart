import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return NextResponse.json({ error: "Alerts need Supabase configured" }, { status: 503 });
  const { sub, codes } = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const clean = Array.isArray(codes) ? codes.filter((c: unknown) => typeof c === "string" && /^[A-Z]{2}$/.test(c as string)).slice(0, 14) : [];
  const { createClient } = await import("@supabase/supabase-js");
  const { error } = await createClient(url, key).from("push_subs").upsert({ endpoint: sub.endpoint, sub, codes: clean });
  return error ? NextResponse.json({ error: "save failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) return NextResponse.json({ ok: true });
  const { endpoint } = await req.json();
  const { createClient } = await import("@supabase/supabase-js");
  await createClient(url, key).from("push_subs").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
