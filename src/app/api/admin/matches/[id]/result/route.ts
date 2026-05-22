import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const resultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  realOutcome: z.enum(["home", "away", "draw"]),
  winnerTeamId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = resultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { homeScore, awayScore, realOutcome, winnerTeamId } = parsed.data;

    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore,
        awayScore,
        realOutcome,
        winnerTeamId: winnerTeamId || null,
        status: "finished",
        lastSyncedAt: new Date(),
      },
    });

    // Lock predictions for this match
    await prisma.prediction.updateMany({
      where: { matchId: id },
      data: { status: "locked", lockedAt: new Date() },
    });

    // Recalculate points for all users who predicted this match
    const affectedPredictions = await prisma.prediction.findMany({
      where: { matchId: id },
      select: { userId: true },
    });

    const uniqueUserIds = [...new Set(affectedPredictions.map((p) => p.userId))];
    await Promise.all(uniqueUserIds.map((userId) => calculateUserPoints(userId)));

    return NextResponse.json({ match, recalculated: uniqueUserIds.length });
  } catch (error) {
    console.error("Match result POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
