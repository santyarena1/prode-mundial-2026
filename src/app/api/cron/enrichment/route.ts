import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncMatchEvents, syncResults } from "@/lib/sync";

// Runs every 15 min: syncs results for in-progress matches + events for just-finished ones
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Sync results for non-finished matches
  const resultsResult = await syncResults();

  // 2. Sync events for recently finished matches (last 3 hours)
  const recentlyFinished = await prisma.match.findMany({
    where: {
      status: "finished",
      externalId: { not: null },
      updatedAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    },
  });

  const eventResults: string[] = [];
  for (const match of recentlyFinished) {
    const r = await syncMatchEvents(match.id);
    if (r.success) eventResults.push(`${match.matchCode}: ${r.message}`);
  }

  return NextResponse.json({
    results: resultsResult,
    events: { synced: eventResults.length, details: eventResults },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
