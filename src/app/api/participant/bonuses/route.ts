import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const claimBonusSchema = z.object({
  bonusActionId: z.string().min(1),
  evidenceUrl: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bonusActions = await prisma.bonusAction.findMany({
      where: { active: true },
      include: { sponsor: true },
    });

    // Get user's claimed bonuses
    const userBonuses = await prisma.userBonus.findMany({
      where: { userId: auth.userId },
      select: { bonusActionId: true, status: true },
    });

    const claimedMap = new Map(userBonuses.map((b) => [b.bonusActionId, b.status]));

    const result = bonusActions.map((action) => ({
      ...action,
      claimedStatus: claimedMap.get(action.id) || null,
    }));

    return NextResponse.json({ bonusActions: result });
  } catch (error) {
    console.error("Bonuses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = claimBonusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { bonusActionId, evidenceUrl } = parsed.data;

    const bonusAction = await prisma.bonusAction.findUnique({ where: { id: bonusActionId } });
    if (!bonusAction || !bonusAction.active) {
      return NextResponse.json({ error: "Bonus action not found or inactive" }, { status: 404 });
    }

    // Check for duplicate
    const existing = await prisma.userBonus.findFirst({
      where: { userId: auth.userId, bonusActionId, status: { not: "rejected" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bonus already claimed" }, { status: 409 });
    }

    const userBonus = await prisma.userBonus.create({
      data: {
        userId: auth.userId,
        bonusActionId,
        evidenceUrl: evidenceUrl || null,
        status: bonusAction.requiresApproval ? "pending" : "approved",
        pointsEarned: bonusAction.requiresApproval
          ? 0
          : Math.floor(bonusAction.points * bonusAction.multiplier),
      },
    });

    return NextResponse.json({ userBonus }, { status: 201 });
  } catch (error) {
    console.error("Bonuses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
