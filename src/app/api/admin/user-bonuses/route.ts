import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userBonuses = await prisma.userBonus.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, instagram: true } },
        bonusAction: { select: { name: true, points: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ userBonuses });
  } catch (error) {
    console.error("UserBonuses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Bulk-approve all pending bonuses
export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pending = await prisma.userBonus.findMany({
      where: { status: "pending" },
      include: { bonusAction: { select: { points: true, multiplier: true } } },
    });

    if (pending.length === 0) return NextResponse.json({ approved: 0 });

    // Approve each and recalculate affected users
    const affectedUserIds = new Set<string>();
    for (const b of pending) {
      const pts = Math.floor(b.bonusAction.points * b.bonusAction.multiplier);
      await prisma.userBonus.update({
        where: { id: b.id },
        data: { status: "approved", pointsEarned: pts },
      });
      affectedUserIds.add(b.userId);
    }
    for (const userId of affectedUserIds) {
      await calculateUserPoints(userId);
    }

    return NextResponse.json({ approved: pending.length });
  } catch (error) {
    console.error("UserBonuses POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
