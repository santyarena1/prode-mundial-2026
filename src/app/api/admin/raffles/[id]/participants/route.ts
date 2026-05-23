import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

type UserInfo = { id: string; firstName: string; lastName: string; email: string; instagram: string | null };

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

    const userSelect = { id: true, firstName: true, lastName: true, email: true, instagram: true };

    // Map userId → { user, entries, sources }
    const byUser = new Map<string, { user: UserInfo; entries: number; sources: string[] }>();

    const add = (user: UserInfo, source: string) => {
      const existing = byUser.get(user.id);
      if (existing) {
        existing.entries++;
        existing.sources.push(source);
      } else {
        byUser.set(user.id, { user, entries: 1, sources: [source] });
      }
    };

    // Entries from bonus action claims
    if (raffle.bonusActionId) {
      const bonuses = await prisma.userBonus.findMany({
        where: { bonusActionId: raffle.bonusActionId, status: "approved" },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: "desc" },
      });
      for (const b of bonuses) add(b.user, "cupón");
    }

    // Entries from prize redemptions
    if (raffle.prizeId) {
      const redemptions = await prisma.prizeRedemption.findMany({
        where: { prizeId: raffle.prizeId, status: { not: "rejected" } },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: "desc" },
      });
      for (const r of redemptions) add(r.user, "canje de premio");
    }

    const participants = Array.from(byUser.values()).sort((a, b) => b.entries - a.entries);
    const total = participants.reduce((sum, p) => sum + p.entries, 0);

    return NextResponse.json({ participants, total });
  } catch (error) {
    console.error("Raffle participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
