import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { bracketKey, normalizeMatchSlot } from "@/lib/bracket-validation";
import {
  clearDownstreamBracketPredictions,
  migrateLegacyBracketSlots,
  validateBracketPickForUser,
} from "@/lib/bracket-server";
import { BRACKET_PHASE_ORDER, getEffectiveOfficialFromPhase } from "@/lib/tournament-phase";

/**
 * En modo OFICIAL (desde officialFromPhase) las llaves usan los cruces reales:
 * el pick se valida contra los dos equipos reales del partido, no contra la
 * cascada de predicciones del usuario.
 */
async function validateOfficialBracketPick(
  matchSlot: string,
  teamId: string
): Promise<{ valid: boolean; error?: string }> {
  // En oficial, matchSlot es el matchCode real del partido (incluida la final).
  const match = await prisma.match.findUnique({
    where: { matchCode: matchSlot },
    select: { homeTeamId: true, awayTeamId: true },
  });
  if (!match || !match.homeTeamId || !match.awayTeamId) {
    return { valid: false, error: "Este partido todavía no tiene los equipos definidos." };
  }
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return { valid: false, error: "Solo podés elegir uno de los dos equipos del partido." };
  }
  return { valid: true };
}

const bracketPredictionSchema = z.object({
  phase: z.string().min(1),
  matchSlot: z.string().min(1),
  predictedTeamId: z.string().optional(),
  assignedThirdTeamId: z.string().optional(),
  predictedHomeScore: z.number().int().min(0).max(30).optional(),
  predictedAwayScore: z.number().int().min(0).max(30).optional(),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await migrateLegacyBracketSlots(auth.userId);

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

    const { phase, predictedTeamId, assignedThirdTeamId, predictedHomeScore, predictedAwayScore } = parsed.data;
    const matchSlot = normalizeMatchSlot(phase, parsed.data.matchSlot);

    // ¿Está este usuario en modo OFICIAL para esta fase?
    const modeUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { bracketMode: true, officialFromPhase: true },
    });
    const effectiveOfficialFrom = await getEffectiveOfficialFromPhase(
      modeUser?.bracketMode,
      modeUser?.officialFromPhase
    );
    const officialFromIdx = effectiveOfficialFrom
      ? BRACKET_PHASE_ORDER.indexOf(effectiveOfficialFrom as (typeof BRACKET_PHASE_ORDER)[number])
      : -1;
    const phaseIdx = BRACKET_PHASE_ORDER.indexOf(phase as (typeof BRACKET_PHASE_ORDER)[number]);
    const isOfficialPhase = officialFromIdx >= 0 && phaseIdx >= officialFromIdx;

    const existing = await prisma.bracketPrediction.findFirst({
      where: {
        userId: auth.userId,
        phase,
        matchSlot: { in: [parsed.data.matchSlot, matchSlot] },
      },
    });

    if (existing?.isLocked) {
      const isScoreUpgrade =
        predictedHomeScore !== undefined &&
        predictedAwayScore !== undefined &&
        existing.predictedHomeScore === null &&
        existing.predictedAwayScore === null;

      if (!isScoreUpgrade) {
        return NextResponse.json(
          {
            error: "Tu predicción ya está bloqueada. Canjeá un cambio de predicción para modificarla.",
            locked: true,
          },
          { status: 403 }
        );
      }
    }

    if (predictedTeamId) {
      const validation = isOfficialPhase
        ? await validateOfficialBracketPick(matchSlot, predictedTeamId)
        : await validateBracketPickForUser(
            auth.userId,
            phase,
            matchSlot,
            predictedTeamId,
            assignedThirdTeamId
          );
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || "Equipo inválido." }, { status: 400 });
      }

      // En oficial cada partido es independiente: no hay cascada que invalidar.
      if (
        !isOfficialPhase &&
        existing?.predictedTeamId &&
        existing.predictedTeamId !== predictedTeamId &&
        existing.isLocked
      ) {
        await clearDownstreamBracketPredictions(auth.userId, phase, matchSlot);
      }
    }

    const now = new Date();
    const scoreFields =
      predictedHomeScore !== undefined && predictedAwayScore !== undefined
        ? { predictedHomeScore, predictedAwayScore }
        : {};

    const prediction = await prisma.bracketPrediction.upsert({
      where: {
        userId_phase_matchSlot: { userId: auth.userId, phase, matchSlot },
      },
      update: {
        predictedTeamId,
        ...scoreFields,
        isLocked: true,
        lockedAt: now,
      },
      create: {
        userId: auth.userId,
        phase,
        matchSlot,
        predictedTeamId,
        ...scoreFields,
        isLocked: true,
        lockedAt: now,
      },
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("BracketPredictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
