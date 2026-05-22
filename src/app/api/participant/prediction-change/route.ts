import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function POST() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get cost from settings
    const costSetting = await prisma.setting.findUnique({ where: { key: "prediction_change_cost" } });
    const cost = parseInt(costSetting?.value || "150", 10);

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const availablePoints = user.totalPoints - user.spentPoints;
    if (availablePoints < cost) {
      return NextResponse.json({
        error: `No tenés suficientes puntos. Necesitás ${cost} pts y tenés ${availablePoints} pts disponibles.`,
        required: cost,
        available: availablePoints,
      }, { status: 400 });
    }

    // Deduct points and unlock all predictions in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.userId },
        data: { spentPoints: { increment: cost } },
      });

      await tx.prediction.updateMany({
        where: { userId: auth.userId },
        data: { status: "editable", lockedAt: null },
      });

      await tx.groupPrediction.updateMany({
        where: { userId: auth.userId },
        data: { isLocked: false, lockedAt: null },
      });

      await tx.bracketPrediction.updateMany({
        where: { userId: auth.userId },
        data: { isLocked: false, lockedAt: null },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Predicciones desbloqueadas. Se descontaron ${cost} puntos.`,
      cost,
    });
  } catch (error) {
    console.error("Prediction change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [costSetting, user] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "prediction_change_cost" } }),
      prisma.user.findUnique({ where: { id: auth.userId } }),
    ]);

    const cost = parseInt(costSetting?.value || "150", 10);
    const available = user ? user.totalPoints - user.spentPoints : 0;

    return NextResponse.json({ cost, available, canAfford: available >= cost });
  } catch (error) {
    console.error("Prediction change GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
