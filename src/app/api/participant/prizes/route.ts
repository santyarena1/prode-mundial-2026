import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { totalPoints: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const prizes = await prisma.prize.findMany({
      where: { active: true },
      include: {
        sponsor: true,
        redemptions: { where: { status: { in: ["pending", "approved", "delivered"] } }, select: { id: true } },
      },
      orderBy: { requiredPoints: "asc" },
    });

    const result = prizes.map(({ redemptions, ...prize }) => ({
      ...prize,
      unlocked: user.totalPoints >= prize.requiredPoints,
      isLastOne: prize.stock === 1 && redemptions.length > 0,
      isSoldOut: prize.stock === 0 && redemptions.length > 0,
    }));

    return NextResponse.json({ prizes: result, userPoints: user.totalPoints });
  } catch (error) {
    console.error("Prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
