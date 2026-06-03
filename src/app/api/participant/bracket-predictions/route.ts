import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const bracketPredictionSchema = z.object({
  phase: z.string().min(1),
  matchSlot: z.string().min(1),
  predictedTeamId: z.string().optional(),
  predictedHomeScore: z.number().int().min(0).max(30).optional(),
  predictedAwayScore: z.number().int().min(0).max(30).optional(),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bracketPredictions = await prisma.bracketPrediction.findMany({
      where: { userId: auth.userId },
      include: { predictedTeam: true },
      orderBy: [{ phase: "asc" }, { matchSlot: "asc" }],
    });

    return NextResponse.json({ bracketPredictions });
  } catch (error) {
    console.error("BracketPredictions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = bracketPredictionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { phase, matchSlot, predictedTeamId, predictedHomeScore, predictedAwayScore } = parsed.data;

    // Check if locked
    const existing = await prisma.bracketPrediction.findUnique({
      where: { userId_phase_matchSlot: { userId: auth.userId, phase, matchSlot } },
    });
    if (existing?.isLocked) {
      // Allow adding scores to a locked bracket prediction with no scores (hardcore upgrade)
      const isScoreUpgrade =
        predictedHomeScore !== undefined &&
        predictedAwayScore !== undefined &&
        existing.predictedHomeScore === null &&
        existing.predictedAwayScore === null;

      if (!isScoreUpgrade) {
        return NextResponse.json({
          error: "Tu predicción ya está bloqueada. Canjeá un cambio de predicción para modificarla.",
          locked: true,
        }, { status: 403 });
      }
      // Score upgrade on locked bracket prediction — fall through to upsert
    }

    const now = new Date();
    const scoreFields = predictedHomeScore !== undefined && predictedAwayScore !== undefined
      ? { predictedHomeScore, predictedAwayScore }
      : {};
    const prediction = await prisma.bracketPrediction.upsert({
      where: { userId_phase_matchSlot: { userId: auth.userId, phase, matchSlot } },
      update: { predictedTeamId, ...scoreFields, isLocked: true, lockedAt: now },
      create: { userId: auth.userId, phase, matchSlot, predictedTeamId, ...scoreFields, isLocked: true, lockedAt: now },
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("BracketPredictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
