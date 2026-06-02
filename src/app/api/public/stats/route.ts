import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const [totalParticipants, matchPreds, groupPreds, bracketPreds, topUser] = await Promise.all([
      prisma.user.count({ where: { isBlocked: false } }),
      prisma.prediction.count(),
      prisma.groupPrediction.count(),
      prisma.bracketPrediction.count(),
      prisma.user.findFirst({
        where: { isBlocked: false },
        orderBy: { totalPoints: "desc" },
        select: { totalPoints: true },
      }),
    ]);

    return NextResponse.json({
      totalParticipants,
      totalPredictions: matchPreds + groupPreds + bracketPreds,
      topScore: topUser?.totalPoints ?? 0,
    });
  } catch (error) {
    console.error("Public stats GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
