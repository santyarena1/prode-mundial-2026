import { NextRequest, NextResponse } from "next/server";
import { syncStandings } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const legacySecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  const isAuthorized = cronSecret && (authHeader === `Bearer ${cronSecret}` || legacySecret === cronSecret);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncStandings();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
