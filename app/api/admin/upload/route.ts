import { NextResponse } from "next/server";
import { checkAdminPin } from "@/lib/adminAuth";
import { ingestPdfBuffer } from "@/lib/ingestPdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const bad = checkAdminPin(req);
  if (bad) return NextResponse.json({ ok: false, message: bad.error }, { status: bad.status });
  const f = await req.formData().catch(() => null);
  const file = f?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "No file" }, { status: 400 });
  if (file.size > 8_000_000) return NextResponse.json({ ok: false, message: "File too large" }, { status: 413 });
  try {
    const r = await ingestPdfBuffer(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(r, { status: r.ok ? 200 : 422 });
  } catch (e: any) { return NextResponse.json({ ok: false, message: e.message }, { status: 500 }); }
}
