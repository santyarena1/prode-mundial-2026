import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, prizeId } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const prize = await prisma.squadPrize.findUnique({ where: { id: prizeId } });
  if (!prize || !prize.active || prize.squadId !== id) {
    return NextResponse.json({ error: "Premio no disponible" }, { status: 404 });
  }

  if (prize.stock >= 0) {
    const redeemed = await prisma.squadRedemption.count({
      where: { prizeId, status: "approved" },
    });
    if (redeemed >= prize.stock) {
      return NextResponse.json({ error: "Premio agotado" }, { status: 400 });
    }
  }

  const spentAgg = await prisma.squadRedemption.aggregate({
    where: { memberId: member.id, status: "approved" },
    _sum: { pointsSpent: true },
  });
  const spent = spentAgg._sum.pointsSpent ?? 0;
  const available = member.totalPoints - spent;

  if (available < prize.pointsCost) {
    return NextResponse.json({ error: "No tenés suficientes puntos" }, { status: 400 });
  }

  const redemption = await prisma.squadRedemption.create({
    data: {
      memberId: member.id,
      prizeId,
      pointsSpent: prize.pointsCost,
      status: "pending",
    },
  });

  return NextResponse.json({ redemption }, { status: 201 });
}
