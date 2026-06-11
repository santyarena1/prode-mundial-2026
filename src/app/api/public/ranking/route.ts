import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isBlocked: false },
      orderBy: { totalPoints: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalPoints: true,
      },
    });

    const ranking = users.map((u, idx) => ({
      position: idx + 1,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      totalPoints: u.totalPoints,
    }));

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Public ranking GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
