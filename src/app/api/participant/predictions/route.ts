import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { getMatchPredictionClosedReason } from "@/lib/match-utils";

async function deriveGroupPrediction(userId: string, groupId: string) {
  const group = await prisma.worldCupGroup.findUnique({
    where: { id: groupId },
    include: {
      teams: { select: { id: true } },
      matches: {
        where: { phase: "GROUP_STAGE" },
        select: { id: true, homeTeamId: true, awayTeamId: true },
      },
    },
  });
  if (!group || group.matches.length === 0) return null;

  const matchIds = group.matches.map(m => m.id);
  const preds = await prisma.prediction.findMany({
    where: { userId, matchId: { in: matchIds } },
    select: { matchId: true, predictedOutcome: true, predictedHomeScore: true, predictedAwayScore: true },
  });

  if (preds.length < group.matches.length) return null; // not all predicted yet

  const predMap = new Map(preds.map(p => [p.matchId, p]));
  const stats: Record<string, { pts: number; gd: number; gf: number }> = {};
  for (const t of group.teams) stats[t.id] = { pts: 0, gd: 0, gf: 0 };

  for (const m of group.matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const pred = predMap.get(m.id);
    if (!pred?.predictedOutcome) continue;
    if (!stats[m.homeTeamId]) stats[m.homeTeamId] = { pts: 0, gd: 0, gf: 0 };
    if (!stats[m.awayTeamId]) stats[m.awayTeamId] = { pts: 0, gd: 0, gf: 0 };

    if (pred.predictedOutcome === "home") stats[m.homeTeamId].pts += 3;
    else if (pred.predictedOutcome === "away") stats[m.awayTeamId].pts += 3;
    else { stats[m.homeTeamId].pts += 1; stats[m.awayTeamId].pts += 1; }

    if (pred.predictedHomeScore != null && pred.predictedAwayScore != null) {
      const h = pred.predictedHomeScore, a = pred.predictedAwayScore;
      stats[m.homeTeamId].gd += h - a;
      stats[m.awayTeamId].gd += a - h;
      stats[m.homeTeamId].gf += h;
      stats[m.awayTeamId].gf += a;
    }
  }

  const sorted = Object.entries(stats)
    .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  const firstTeamId  = sorted[0]?.[0] ?? null;
  const secondTeamId = sorted[1]?.[0] ?? null;
  const thirdTeamId  = sorted[2]?.[0] ?? null;

  await prisma.groupPrediction.upsert({
    where: { userId_groupId: { userId, groupId } },
    update: { firstTeamId, secondTeamId, thirdTeamId, isLocked: true, lockedAt: new Date() },
    create: { userId, groupId, firstTeamId, secondTeamId, thirdTeamId, isLocked: true, lockedAt: new Date() },
  });

  return { firstTeamId, secondTeamId, thirdTeamId };
}

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

    // Scores always override outcome — derive from score when both are present
    let predictedOutcome = rest.predictedOutcome;
    if (predictedHomeScore !== undefined && predictedAwayScore !== undefined) {
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
      // Allow adding scores to a prediction locked without scores (hardcore upgrade)
      const isScoreUpgrade =
        predictedHomeScore !== undefined &&
        predictedAwayScore !== undefined &&
        existing.predictedHomeScore === null &&
        existing.predictedAwayScore === null;

      if (isScoreUpgrade) {
        const newOutcome =
          predictedHomeScore > predictedAwayScore ? "home" :
          predictedAwayScore > predictedHomeScore ? "away" : "draw";
        if (newOutcome !== existing.predictedOutcome) {
          return NextResponse.json({
            error: `El marcador debe respetar el ganador ya predicho (${existing.predictedOutcome === "home" ? "local" : existing.predictedOutcome === "away" ? "visita" : "empate"}).`,
            wrongWinner: true,
          }, { status: 400 });
        }
        // Score upgrade allowed — fall through to upsert
      } else {
        return NextResponse.json({
          error: "Tu predicción ya está bloqueada. Canjeá un cambio de predicción para modificarla.",
          locked: true,
        }, { status: 403 });
      }
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: auth.userId, matchId } },
      update: { ...rest, predictedOutcome, predictedHomeScore, predictedAwayScore, status: "locked", lockedAt: now },
      create: { userId: auth.userId, matchId, ...rest, predictedOutcome, predictedHomeScore, predictedAwayScore, status: "locked", lockedAt: now },
    });

    let derivedGroup: { firstTeamId: string | null; secondTeamId: string | null; thirdTeamId: string | null } | null = null;
    if (match.phase === "GROUP_STAGE" && match.groupId) {
      derivedGroup = await deriveGroupPrediction(auth.userId, match.groupId);
    }

    return NextResponse.json({ prediction, derivedGroup, groupId: match.groupId });
  } catch (error) {
    console.error("Predictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
