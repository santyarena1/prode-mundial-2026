import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const redeemSchema = z.object({
  prizeId: z.string().min(1),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const redemptions = await prisma.prizeRedemption.findMany({
      where: { userId: auth.userId },
      include: { prize: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error("Redemptions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { prizeId } = parsed.data;

    const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
    if (!prize) return NextResponse.json({ error: "Prize not found" }, { status: 404 });
    if (!prize.active) return NextResponse.json({ error: "Prize is not active" }, { status: 400 });
    if (prize.stock <= 0) return NextResponse.json({ error: "Prize is out of stock" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.totalPoints < prize.requiredPoints) {
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }

    // Check for duplicate pending redemption
    const existing = await prisma.prizeRedemption.findFirst({
      where: { userId: auth.userId, prizeId, status: "pending" },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a pending redemption for this prize" }, { status: 409 });
    }

    // Create redemption and deduct points in a transaction
    const [redemption] = await prisma.$transaction([
      prisma.prizeRedemption.create({
        data: {
          userId: auth.userId,
          prizeId,
          pointsSpent: prize.requiredPoints,
          status: "pending",
        },
      }),
      prisma.prize.update({
        where: { id: prizeId },
        data: { stock: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: auth.userId },
        data: {
          spentPoints: { increment: prize.requiredPoints },
          totalPoints: { decrement: prize.requiredPoints },
        },
      }),
    ]);

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error) {
    console.error("Redemptions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
