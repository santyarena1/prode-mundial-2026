import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const prizes = await prisma.prize.findMany({
      where: { active: true },
      include: {
        sponsor: true,
        redemptions: { where: { status: { in: ["pending", "approved", "delivered"] } }, select: { id: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { requiredPoints: "asc" }],
    });

    const result = prizes.map(({ redemptions, ...prize }) => ({
      ...prize,
      isLastOne: prize.stock === 1 && redemptions.length > 0,
      isSoldOut: prize.stock === 0 && redemptions.length > 0,
    }));

    return NextResponse.json({ prizes: result });
  } catch (error) {
    console.error("Public prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
