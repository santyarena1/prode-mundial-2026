import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const schema = z.object({
  points: z.number().int().min(1).max(100000),
  note: z.string().max(200).optional(),
  operation: z.enum(["add", "subtract"]).default("add"),
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Find or create a "manual admin points" bonus action
    let manualAction = await prisma.bonusAction.findFirst({
      where: { name: "Puntos extra (admin)" },
    });
    if (!manualAction) {
      manualAction = await prisma.bonusAction.create({
        data: {
          name: "Puntos extra (admin)",
          description: "Puntos otorgados manualmente por el administrador",
          points: 0,
          requiresApproval: false,
          active: false,
          allowMultipleClaims: true,
        },
      });
    }

    const { points, note, operation } = parsed.data;
    const pointsEarned = operation === "subtract" ? -points : points;

    await prisma.userBonus.create({
      data: {
        userId: id,
        bonusActionId: manualAction.id,
        status: "approved",
        pointsEarned,
        socialHandles: note || null,
      },
    });

    await calculateUserPoints(id);

    const updated = await prisma.user.findUnique({
      where: { id },
      select: { totalPoints: true, bonusPoints: true },
    });

    return NextResponse.json({ ok: true, operation, points, totalPoints: updated?.totalPoints, bonusPoints: updated?.bonusPoints });
  } catch (error) {
    console.error("Manual points error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
