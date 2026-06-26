import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

// GET  → preview: lista quiénes tienen el logro y cuántos puntos perderían
// POST → confirma y revoca el logro a todos los que no cumplen 12 grupos

export async function GET(_req: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affected = await prisma.userAchievement.findMany({
    where: { achievementRule: { key: "L1_EAGLE_EYE" } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, totalPoints: true, achievementPoints: true } },
      achievementRule: { select: { key: true, name: true } },
    },
  });

  return NextResponse.json({
    count: affected.length,
    users: affected.map((a) => ({
      userId: a.user.id,
      name: `${a.user.firstName} ${a.user.lastName}`,
      email: a.user.email,
      pointsToRevoke: a.pointsEarned,
      currentTotal: a.user.totalPoints,
      newTotal: a.user.totalPoints - a.pointsEarned,
    })),
  });
}

export async function POST(_req: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affected = await prisma.userAchievement.findMany({
    where: { achievementRule: { key: "L1_EAGLE_EYE" } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, totalPoints: true, achievementPoints: true } },
    },
  });

  if (affected.length === 0) {
    return NextResponse.json({ revoked: 0, message: "No hay usuarios con este logro." });
  }

  // Revoke surgically: subtract only this achievement's points, delete the record
  await Promise.all(
    affected.map(async (a) => {
      await prisma.user.update({
        where: { id: a.userId },
        data: {
          achievementPoints: { decrement: a.pointsEarned },
          totalPoints: { decrement: a.pointsEarned },
        },
      });
      await prisma.userAchievement.delete({ where: { id: a.id } });
    })
  );

  return NextResponse.json({
    revoked: affected.length,
    users: affected.map((a) => ({
      name: `${a.user.firstName} ${a.user.lastName}`,
      pointsRevoked: a.pointsEarned,
    })),
  });
}
