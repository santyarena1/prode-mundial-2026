import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        instagram: true,
        hardcoreMode: true,
        totalPoints: true,
        predictionPoints: true,
        bonusPoints: true,
        achievementPoints: true,
        spentPoints: true,
        isBlocked: true,
        earlyBirdGranted: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...profile } = user;

    // Check if user is eligible for early bird (registered before any raffle's cutoff) but hasn't claimed yet
    let earlyBirdEligible = false;
    if (!user.earlyBirdGranted) {
      const earlyBirdRaffle = await prisma.weeklyRaffle.findFirst({
        where: {
          bonusActionId: { not: null },
          status: { in: ["upcoming", "live"] },
          earlyBirdCutoff: { gte: user.createdAt },
        },
        orderBy: { earlyBirdCutoff: "asc" },
      });
      earlyBirdEligible = !!earlyBirdRaffle;
    }

    return NextResponse.json({ user: { ...profile, hasPassword: !!passwordHash, earlyBirdEligible } });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
