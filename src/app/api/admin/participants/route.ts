import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawUsers = await prisma.user.findMany({
      orderBy: { totalPoints: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        instagram: true,
        totalPoints: true,
        predictionPoints: true,
        bonusPoints: true,
        spentPoints: true,
        isBlocked: true,
        passwordHash: true,
        createdAt: true,
        _count: {
          select: { predictions: { where: { status: "locked" } } },
        },
        squadMemberships: {
          select: {
            role: true,
            squad: { select: { id: true, name: true } },
          },
        },
      },
    });

    const users = rawUsers.map(({ passwordHash, ...user }) => ({
      ...user,
      hasPassword: !!passwordHash,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Participants GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
