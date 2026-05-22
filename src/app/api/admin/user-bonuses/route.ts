import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bonuses = await prisma.userBonus.findMany({
      where: { status: "pending" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        bonusAction: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ bonuses });
  } catch (error) {
    console.error("UserBonuses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
