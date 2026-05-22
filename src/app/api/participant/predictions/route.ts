import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { getMatchPredictionClosedReason } from "@/lib/match-utils";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  predictedOutcome: z.enum(["home", "away", "draw"]).optional(),
  predictedWinnerTeamId: z.string().optional(),
  predictedHomeScore: z.number().int().min(0).optional(),
  predictedAwayScore: z.number().int().min(0).optional(),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const predictions = await prisma.prediction.findMany({
      where: { userId: auth.userId },
      include: {
        match: {
          include: { homeTeam: true, awayTeam: true, group: true },
        },
      },
      orderBy: { match: { startDate: "asc" } },
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Predictions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = predictionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { matchId, predictedHomeScore, predictedAwayScore, ...rest } = parsed.data;

    // Infer outcome from scores when in hardcore mode
    let predictedOutcome = rest.predictedOutcome;
    if (predictedHomeScore !== undefined && predictedAwayScore !== undefined && !predictedOutcome) {
      if (predictedHomeScore > predictedAwayScore) predictedOutcome = "home";
      else if (predictedAwayScore > predictedHomeScore) predictedOutcome = "away";
      else predictedOutcome = "draw";
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    const now = new Date();
    const closedReason = getMatchPredictionClosedReason(match.startDate, match.status, now);
    if (closedReason) {
      return NextResponse.json({ error: closedReason }, { status: 400 });
    }

    // Check if prediction is locked
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: auth.userId, matchId } },
    });
    if (existing && existing.status === "locked") {
      return NextResponse.json({
        error: "Tu predicción ya está bloqueada. Canjeá un cambio de predicción para modificarla.",
        locked: true,
      }, { status: 403 });
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: auth.userId, matchId } },
      update: { ...rest, predictedOutcome, predictedHomeScore, predictedAwayScore, status: "locked", lockedAt: now },
      create: { userId: auth.userId, matchId, ...rest, predictedOutcome, predictedHomeScore, predictedAwayScore, status: "locked", lockedAt: now },
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("Predictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
