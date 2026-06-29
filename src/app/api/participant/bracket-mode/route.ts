import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";
import {
  BRACKET_PHASE_ORDER,
  getTournamentPhaseState,
} from "@/lib/tournament-phase";

const schema = z.object({
  mode: z.enum(["CLASSIC", "OFFICIAL"]),
});

export async function GET() {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { bracketMode: true, officialFromPhase: true, bracketModeChosenAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }
    const { mode } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { bracketMode: true, officialFromPhase: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // El modo OFICIAL es definitivo: una vez elegido no se puede volver atrás.
    if (user.bracketMode === "OFFICIAL") {
      return NextResponse.json(
        { error: "Ya estás en el modo Resultados Oficiales y no se puede volver atrás." },
        { status: 409 }
      );
    }

    const now = new Date();

    // ── Quedarse en el modo clásico ────────────────────────────────────────
    if (mode === "CLASSIC") {
      const updated = await prisma.user.update({
        where: { id: auth.userId },
        data: {
          bracketMode: "CLASSIC",
          // No tocamos officialFromPhase: sigue null, puede pasarse a oficial más adelante.
          bracketModeChosenAt: user.bracketMode ? undefined : now,
        },
        select: { bracketMode: true, officialFromPhase: true, bracketModeChosenAt: true },
      });
      return NextResponse.json(updated);
    }

    // ── Pasarse a Resultados Oficiales ─────────────────────────────────────
    // El modo oficial corre desde la primera fase que TODAVÍA no terminó: incluye
    // la fase en curso (16vos ya sorteado), cuyos cruces reales ya están definidos.
    // Las fases ya terminadas se respetan con sus puntos clásicos.
    const { firstUnfinishedBracketPhase } = await getTournamentPhaseState();
    if (!firstUnfinishedBracketPhase) {
      return NextResponse.json(
        { error: "El torneo ya terminó: no quedan fases para el modo oficial." },
        { status: 409 }
      );
    }

    const fromIdx = BRACKET_PHASE_ORDER.indexOf(
      firstUnfinishedBracketPhase as (typeof BRACKET_PHASE_ORDER)[number]
    );
    const futurePhases = BRACKET_PHASE_ORDER.slice(Math.max(0, fromIdx));

    await prisma.$transaction([
      // Se reinician las predicciones de bracket de las fases futuras: en oficial
      // las llaves se rearman con los resultados reales.
      prisma.bracketPrediction.deleteMany({
        where: { userId: auth.userId, phase: { in: [...futurePhases] } },
      }),
      prisma.user.update({
        where: { id: auth.userId },
        data: {
          bracketMode: "OFFICIAL",
          officialFromPhase: firstUnfinishedBracketPhase,
          bracketModeChosenAt: now,
        },
      }),
    ]);

    // Recalcular puntos: lo ya ganado se mantiene, lo futuro queda en cero hasta predecir.
    await calculateUserPoints(auth.userId);

    return NextResponse.json({
      bracketMode: "OFFICIAL",
      officialFromPhase: firstUnfinishedBracketPhase,
      bracketModeChosenAt: now,
    });
  } catch (error) {
    console.error("bracket-mode POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
