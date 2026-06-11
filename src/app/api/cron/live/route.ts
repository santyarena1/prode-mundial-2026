import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncLive } from "@/lib/sync";
import { calculateUserPoints } from "@/lib/points";

export const maxDuration = 60;

const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncLive();

  // For each match that just finished: lock match predictions + recalculate affected users
  let recalculatedUsers = 0;
  for (const matchId of result.finishedMatchIds) {
    await prisma.prediction.updateMany({
      where: { matchId },
      data: { status: "locked", lockedAt: new Date() },
    });

    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      select: { userId: true },
    });
    const uniqueUserIds = [...new Set(predictions.map((p) => p.userId))];

    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((userId) => calculateUserPoints(userId)));
    }
    recalculatedUsers += uniqueUserIds.length;
  }

  return NextResponse.json({ ...result, recalculatedUsers });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
