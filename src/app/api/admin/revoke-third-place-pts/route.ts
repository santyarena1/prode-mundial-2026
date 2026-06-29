import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateGroupQualifiers, DEFAULT_POINT_RULES } from "@/lib/points";

const THIRD_PTS = DEFAULT_POINT_RULES.GROUP_THIRD_QUALIFIED.points; // 800

async function findAffected() {
  const groupPredictions = await prisma.groupPrediction.findMany({
    where: { thirdTeamId: { not: null }, pointsEarned: { gt: 0 } },
    include: {
      group: {
        include: {
          teams: { select: { id: true } },
          matches: {
            select: { phase: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
          },
        },
      },
      user: { select: { id: true, firstName: true, lastName: true, email: true, totalPoints: true, predictionPoints: true } },
    },
  });

  const affected: Array<{
    gpId: string;
    userId: string;
    user: { id: string; firstName: string; lastName: string; email: string; totalPoints: number; predictionPoints: number };
    groupName: string;
    ptsToRevoke: number;
    currentGpEarned: number;
  }> = [];

  for (const gp of groupPredictions) {
    const groupMatches = gp.group.matches.filter((m) => m.phase === "GROUP_STAGE");
    const finished = groupMatches.filter((m) => m.status === "finished");
    if (finished.length < groupMatches.length || groupMatches.length === 0) continue;

    const { third } = calculateGroupQualifiers(gp.group.teams, gp.group.matches);
    if (!third || gp.thirdTeamId !== third) continue;

    affected.push({
      gpId: gp.id,
      userId: gp.userId,
      user: gp.user,
      groupName: gp.group.name,
      ptsToRevoke: THIRD_PTS,
      currentGpEarned: gp.pointsEarned,
    });
  }

  return affected;
}

// GET → preview
export async function GET(_req: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affected = await findAffected();

  const byUser: Record<string, { name: string; email: string; groups: string[]; ptsToRevoke: number; currentTotal: number }> = {};
  for (const a of affected) {
    if (!byUser[a.userId]) {
      byUser[a.userId] = {
        name: `${a.user.firstName} ${a.user.lastName}`,
        email: a.user.email,
        groups: [],
        ptsToRevoke: 0,
        currentTotal: a.user.totalPoints,
      };
    }
    byUser[a.userId].groups.push(`Grupo ${a.groupName}`);
    byUser[a.userId].ptsToRevoke += a.ptsToRevoke;
  }

  const users = Object.values(byUser);
  return NextResponse.json({
    totalGroupPredictions: affected.length,
    totalUsersAffected: users.length,
    totalPtsToRevoke: affected.reduce((s, a) => s + a.ptsToRevoke, 0),
    users: users.map((u) => ({
      ...u,
      newTotal: u.currentTotal - u.ptsToRevoke,
    })),
  });
}

// POST → aplica la revocación
export async function POST(_req: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affected = await findAffected();
  if (affected.length === 0) {
    return NextResponse.json({ revoked: 0, message: "No hay predicciones de 3° con puntos para revocar." });
  }

  // Agrupar por usuario para saber cuántos puntos restar en total
  const byUser: Record<string, { name: string; totalToRevoke: number }> = {};
  for (const a of affected) {
    if (!byUser[a.userId]) byUser[a.userId] = { name: `${a.user.firstName} ${a.user.lastName}`, totalToRevoke: 0 };
    byUser[a.userId].totalToRevoke += a.ptsToRevoke;
  }

  await Promise.all([
    // Actualizar cada GroupPrediction: restar THIRD_PTS de pointsEarned
    ...affected.map((a) =>
      prisma.groupPrediction.update({
        where: { id: a.gpId },
        data: { pointsEarned: { decrement: a.ptsToRevoke } },
      })
    ),
    // Actualizar cada usuario: restar el total de sus grupos afectados
    ...Object.entries(byUser).map(([userId, { totalToRevoke }]) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          predictionPoints: { decrement: totalToRevoke },
          totalPoints: { decrement: totalToRevoke },
        },
      })
    ),
  ]);

  return NextResponse.json({
    revoked: affected.length,
    usersAffected: Object.keys(byUser).length,
    details: Object.entries(byUser).map(([, v]) => ({ name: v.name, ptsRevoked: v.totalToRevoke })),
  });
}
