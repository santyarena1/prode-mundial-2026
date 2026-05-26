import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncMatchEvents } from "@/lib/sync";

export const maxDuration = 60;

// Syncs match events (goals, cards) for recently finished matches
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({ synced: eventResults.length, details: eventResults });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
