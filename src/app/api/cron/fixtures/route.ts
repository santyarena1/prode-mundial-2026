import { NextRequest, NextResponse } from "next/server";
import { syncFixtures } from "@/lib/sync";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const legacySecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const isAuthorized = isVercelCron || (cronSecret && (authHeader === `Bearer ${cronSecret}` || legacySecret === cronSecret));
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncFixtures();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
