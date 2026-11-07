import { NextResponse } from "next/server";
import { loadDraws } from "@/lib/store";

export const dynamic = "force-dynamic"; // headers below decide edge caching

export async function GET() {
  const payload = await loadDraws();
  return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
