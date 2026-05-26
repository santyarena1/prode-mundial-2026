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

    const redemption = await prisma.$transaction(async (tx) => {
      const [prize, user] = await Promise.all([
        tx.prize.findUnique({ where: { id: prizeId } }),
        tx.user.findUnique({ where: { id: auth.userId } }),
      ]);

      if (!prize) throw new Error("404:Prize not found");
      if (!prize.active) throw new Error("400:Prize is not active");
      if (!user) throw new Error("404:User not found");
      if (user.totalPoints < prize.requiredPoints) throw new Error("400:Insufficient points");

      const existing = await tx.prizeRedemption.findFirst({
        where: { userId: auth.userId, prizeId, status: "pending" },
      });
      if (existing) throw new Error("409:You already have a pending redemption for this prize");

      // Atomic stock decrement — only succeeds if stock > 0
      const stockUpdate = await tx.prize.updateMany({
        where: { id: prizeId, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (stockUpdate.count === 0) throw new Error("400:Prize is out of stock");

      await tx.user.update({
        where: { id: auth.userId },
        data: {
          spentPoints: { increment: prize.requiredPoints },
          totalPoints: { decrement: prize.requiredPoints },
        },
      });

      return tx.prizeRedemption.create({
        data: {
          userId: auth.userId,
          prizeId,
          pointsSpent: prize.requiredPoints,
          status: "pending",
        },
      });
    });

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const m = error.message.match(/^(\d{3}):(.+)/);
      if (m) return NextResponse.json({ error: m[2] }, { status: parseInt(m[1]) });
    }
    console.error("Redemptions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
