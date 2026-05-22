import { NextRequest, NextResponse } from "next/server";
import { syncStandings } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncStandings();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
