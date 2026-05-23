import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

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
