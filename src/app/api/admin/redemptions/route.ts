import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const redemptions = await prisma.prizeRedemption.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        prize: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error("Redemptions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
