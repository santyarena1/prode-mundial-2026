import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const raffle = await prisma.weeklyRaffle.findUnique({ where: { id } });
    if (!raffle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!raffle.bonusActionId) {
      return NextResponse.json({ participants: [], total: 0 });
    }

    const bonuses = await prisma.userBonus.findMany({
      where: { bonusActionId: raffle.bonusActionId, status: "approved" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, instagram: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by userId to count entries
    const byUser = new Map<string, { user: typeof bonuses[0]["user"]; entries: number; bonusIds: string[] }>();
    for (const b of bonuses) {
      const existing = byUser.get(b.userId);
      if (existing) {
        existing.entries++;
        existing.bonusIds.push(b.id);
      } else {
        byUser.set(b.userId, { user: b.user, entries: 1, bonusIds: [b.id] });
      }
    }

    const participants = Array.from(byUser.values()).sort((a, b) => b.entries - a.entries);
    return NextResponse.json({ participants, total: bonuses.length });
  } catch (error) {
    console.error("Raffle participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
