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
    return NextResponse.json({ user: { ...profile, hasPassword: !!passwordHash } });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
