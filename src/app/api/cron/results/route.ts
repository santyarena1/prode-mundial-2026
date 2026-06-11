import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncResults } from "@/lib/sync";
import { calculateUserPoints } from "@/lib/points";

export const maxDuration = 300;

const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Sync results from provider
  const syncResult = await syncResults();

  // 2. Lock predictions for newly finished matches
  for (const matchId of syncResult.finishedMatchIds) {
    await prisma.prediction.updateMany({
      where: { matchId },
      data: { status: "locked", lockedAt: new Date() },
    });
  }

  // 3. Recalculate ALL users with at least one prediction on a finished match.
  //    Running every cycle ensures retroactive fixes (e.g. point rule corrections)
  //    propagate automatically without any manual intervention.
  const affectedUserIds = await prisma.prediction.findMany({
    where: { match: { status: "finished" } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const uniqueUserIds = affectedUserIds.map((p) => p.userId);

  let recalculatedUsers = 0;
  for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
    const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((userId) => calculateUserPoints(userId)));
    recalculatedUsers += batch.length;
  }

  return NextResponse.json({
    ...syncResult,
    recalculatedUsers,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
