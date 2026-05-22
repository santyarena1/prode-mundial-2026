import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const updateBonusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  pointsEarned: z.number().int().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBonusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const existing = await prisma.userBonus.findUnique({
      where: { id },
      include: { bonusAction: true },
    });

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pointsToAward =
      parsed.data.pointsEarned !== undefined
        ? parsed.data.pointsEarned
        : Math.floor(existing.bonusAction.points * existing.bonusAction.multiplier);

    const bonus = await prisma.userBonus.update({
      where: { id },
      data: {
        status: parsed.data.status,
        pointsEarned: parsed.data.status === "approved" ? pointsToAward : 0,
      },
    });

    // Recalculate user points after approval/rejection
    await calculateUserPoints(existing.userId);

    return NextResponse.json({ bonus });
  } catch (error) {
    console.error("UserBonus PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
