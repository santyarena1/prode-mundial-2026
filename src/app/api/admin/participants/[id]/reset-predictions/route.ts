import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const PREDICTION_TYPES = ["matches", "groups", "bracket"] as const;
type PredictionType = (typeof PREDICTION_TYPES)[number];

const resetSchema = z.object({
  types: z
    .array(z.enum(PREDICTION_TYPES))
    .min(1, { message: "Seleccioná al menos un tipo de predicción" }),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: userId } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const [matchTotal, matchLocked, groupTotal, groupLocked, bracketTotal, bracketLocked] =
      await Promise.all([
        prisma.prediction.count({ where: { userId } }),
        prisma.prediction.count({
          where: { userId, OR: [{ status: "locked" }, { lockedAt: { not: null } }] },
        }),
        prisma.groupPrediction.count({ where: { userId } }),
        prisma.groupPrediction.count({ where: { userId, isLocked: true } }),
        prisma.bracketPrediction.count({ where: { userId } }),
        prisma.bracketPrediction.count({ where: { userId, isLocked: true } }),
      ]);

    return NextResponse.json({
      summary: {
        matches: { total: matchTotal, locked: matchLocked },
        groups: { total: groupTotal, locked: groupLocked },
        bracket: { total: bracketTotal, locked: bracketLocked },
      },
    });
  } catch (error) {
    console.error("Reset predictions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: userId } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const types = new Set(parsed.data.types);
    const unlocked: Partial<Record<PredictionType, number>> = {};

    if (types.has("matches")) {
      const r = await prisma.prediction.updateMany({
        where: { userId },
        data: { status: "editable", lockedAt: null },
      });
      unlocked.matches = r.count;
    }

    if (types.has("groups")) {
      const r = await prisma.groupPrediction.updateMany({
        where: { userId },
        data: { isLocked: false, lockedAt: null },
      });
      unlocked.groups = r.count;
    }

    if (types.has("bracket")) {
      const r = await prisma.bracketPrediction.updateMany({
        where: { userId },
        data: { isLocked: false, lockedAt: null },
      });
      unlocked.bracket = r.count;
    }

    const labels: Record<PredictionType, string> = {
      matches: "partidos",
      groups: "grupos",
      bracket: "eliminatorias",
    };
    const resetLabels = parsed.data.types.map((t) => labels[t]).join(", ");

    return NextResponse.json({
      success: true,
      message: `Desbloqueado para ${user.firstName} ${user.lastName}: ${resetLabels}`,
      unlocked,
    });
  } catch (error) {
    console.error("Reset predictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
