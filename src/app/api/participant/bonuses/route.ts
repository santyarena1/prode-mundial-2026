import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const claimBonusSchema = z.object({
  bonusActionId: z.string().min(1),
  evidenceUrl: z.string().optional(),
  socialHandles: z.record(z.string(), z.string()).optional(),
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

    const { bonusActionId, evidenceUrl, socialHandles } = parsed.data;

    const bonusAction = await prisma.bonusAction.findUnique({ where: { id: bonusActionId } });
    if (!bonusAction || !bonusAction.active) {
      return NextResponse.json({ error: "Bonus action not found or inactive" }, { status: 404 });
    }

    // Completar todo el prode: require predictions for ALL matches in DB
    if (bonusAction.name === "Completar todo el prode inicial") {
      const [totalMatches, userPredictions] = await Promise.all([
        prisma.match.count(),
        prisma.prediction.count({ where: { userId: auth.userId } }),
      ]);
      if (userPredictions < totalMatches) {
        return NextResponse.json(
          { error: `Completá todas las predicciones antes de reclamar este bonus (${userPredictions}/${totalMatches} partidos completados).` },
          { status: 400 }
        );
      }
    }

    const pointsEarned = Math.floor(bonusAction.points * bonusAction.multiplier);

    // Wrap duplicate check + create in a transaction to prevent concurrent double-claims
    const userBonus = await prisma.$transaction(async (tx) => {
      if (!bonusAction.allowMultipleClaims) {
        const existing = await tx.userBonus.findFirst({
          where: { userId: auth.userId, bonusActionId, status: { not: "rejected" } },
        });
        if (existing) throw new Error("409:Bonus already claimed");
      }
      return tx.userBonus.create({
        data: {
          userId: auth.userId,
          bonusActionId,
          evidenceUrl: evidenceUrl || null,
          socialHandles: socialHandles ? JSON.stringify(socialHandles) : null,
          status: "approved",
          pointsEarned,
        },
      });
    });

    await calculateUserPoints(auth.userId);

    return NextResponse.json({ userBonus, pointsEarned }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const m = error.message.match(/^(\d{3}):(.+)/);
      if (m) return NextResponse.json({ error: m[2] }, { status: parseInt(m[1]) });
    }
    console.error("Bonuses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
