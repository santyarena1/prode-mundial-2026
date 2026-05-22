import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

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
        achievementPoints: true,
        spentPoints: true,
      },
    });

    const ranking = users.map((u, idx) => ({ ...u, position: idx + 1 }));
    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Admin ranking GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Recalculate all users' points
export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({ select: { id: true } });
    let processed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        await calculateUserPoints(user.id);
        processed++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ success: true, processed, errors, total: users.length });
  } catch (error) {
    console.error("Recalculate all error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
