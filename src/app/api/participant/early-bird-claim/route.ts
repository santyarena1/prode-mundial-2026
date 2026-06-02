import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function POST() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, earlyBirdGranted: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.earlyBirdGranted) {
      return NextResponse.json({ error: "Ya reclamaste tu ticket" }, { status: 409 });
    }

    // Find the raffle prize to attach the redemption to
    const rafflePrize = await prisma.prize.findFirst({
      where: { prizeType: "raffle", active: true },
      orderBy: { createdAt: "asc" },
    });

    if (!rafflePrize) {
      return NextResponse.json({ error: "No hay sorteo disponible para reclamar" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.prizeRedemption.create({
        data: {
          userId: user.id,
          prizeId: rafflePrize.id,
          pointsSpent: 0,
          status: "approved",
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { earlyBirdGranted: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Early bird claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
