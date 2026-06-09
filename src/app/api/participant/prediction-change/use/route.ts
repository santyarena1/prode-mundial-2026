import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { bracketKey, getDownstreamBracketKeys, normalizeMatchSlot } from "@/lib/bracket-validation";
import {
  buildBracketContext,
  clearDownstreamBracketPredictions,
  migrateLegacyBracketSlots,
  validateBracketPickForUser,
} from "@/lib/bracket-server";

const useChangeSchema = z.object({
  type: z.enum(["match", "group", "bracket"]),
  id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = useChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (user.predictionChangesRemaining <= 0) {
      return NextResponse.json({ error: "No tenés créditos de cambio disponibles." }, { status: 400 });
    }

    const { type, id } = parsed.data;

    if (type === "match") {
      const prediction = await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: auth.userId, matchId: id } },
      });
      if (!prediction) {
        return NextResponse.json({ error: "Predicción no encontrada." }, { status: 404 });
      }
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { status: "editable", lockedAt: null },
      });
    } else if (type === "group") {
      const groupPred = await prisma.groupPrediction.findUnique({
        where: { userId_groupId: { userId: auth.userId, groupId: id } },
      });
      if (!groupPred) {
        return NextResponse.json({ error: "Predicción de grupo no encontrada." }, { status: 404 });
      }
      await prisma.groupPrediction.update({
        where: { id: groupPred.id },
        data: { isLocked: false, lockedAt: null },
      });
    } else if (type === "bracket") {
      const [phase, ...rest] = id.split(":");
      const slot = rest.join(":");
      if (!phase || !slot) {
        return NextResponse.json({ error: "ID de bracket inválido." }, { status: 400 });
      }
      const normalizedSlot = normalizeMatchSlot(phase, slot);
      const existing = await prisma.bracketPrediction.findFirst({
        where: {
          userId: auth.userId,
          phase,
          matchSlot: { in: [slot, normalizedSlot] },
        },
      });
      if (!existing) {
        return NextResponse.json({ error: "Predicción de llave no encontrada." }, { status: 404 });
      }

      await clearDownstreamBracketPredictions(auth.userId, phase, normalizedSlot);

      await prisma.bracketPrediction.update({
        where: { id: existing.id },
        data: { isLocked: false, lockedAt: null },
      });
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: { predictionChangesRemaining: { decrement: 1 } },
      select: { predictionChangesRemaining: true },
    });

    return NextResponse.json({
      success: true,
      message: "Predicción desbloqueada. Podés modificarla ahora.",
      changesRemaining: updated.predictionChangesRemaining,
    });
  } catch (error) {
    console.error("Prediction change use error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
