import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { getCalendarDayInTz, MATCH_PREDICTION_TZ } from "@/lib/match-utils";

function startOfDayInArgentina(date = new Date()): Date {
  const day = getCalendarDayInTz(date, MATCH_PREDICTION_TZ);
  return new Date(`${day}T00:00:00-03:00`);
}

function startOfMonthInArgentina(date = new Date()): Date {
  const day = getCalendarDayInTz(date, MATCH_PREDICTION_TZ);
  const [y, m] = day.split("-");
  return new Date(`${y}-${m}-01T00:00:00-03:00`);
}

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const startOfToday = startOfDayInArgentina();
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = startOfMonthInArgentina();

    const [
      rawUsers,
      total,
      joinedToday,
      joinedWeek,
      joinedMonth,
      withPredictions,
    ] = await Promise.all([
      prisma.user.findMany({
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
            select: {
              predictions: { where: { status: "locked" } },
              groupPredictions: true,
              bracketPredictions: true,
              specialPredictions: true,
            },
          },
          squadMemberships: {
            select: {
              role: true,
              squad: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({
        where: {
          OR: [
            { predictions: { some: {} } },
            { groupPredictions: { some: {} } },
            { bracketPredictions: { some: {} } },
            { specialPredictions: { some: {} } },
          ],
        },
      }),
    ]);

    const users = rawUsers.map(({ passwordHash, _count, ...user }) => ({
      ...user,
      hasPassword: !!passwordHash,
      _count: {
        predictions:
          (_count.predictions ?? 0) +
          (_count.groupPredictions ?? 0) +
          (_count.bracketPredictions ?? 0) +
          (_count.specialPredictions ?? 0),
      },
    }));

    return NextResponse.json({
      users,
      stats: {
        total,
        joinedToday,
        joinedWeek,
        joinedMonth,
        withPredictions,
        missingPredictions: total - withPredictions,
      },
    });
  } catch (error) {
    console.error("Participants GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
