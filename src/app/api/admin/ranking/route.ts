import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { totalPoints: "desc" },
      take: 100,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        totalPoints: true,
        predictionPoints: true,
        bonusPoints: true,
      },
    });

    const ranking = users.map((u, idx) => ({ ...u, position: idx + 1 }));
    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Admin ranking GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
