import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { getUserPointsBreakdown } from "@/lib/user-points-breakdown";
import { calculateGroupQualifiers } from "@/lib/points";

const updateUserSchema = z.object({
  isBlocked: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        predictions: {
          include: { match: { include: { homeTeam: true, awayTeam: true } } },
          orderBy: { createdAt: "desc" },
        },
        groupPredictions: { include: { group: true, firstTeam: true, secondTeam: true, thirdTeam: true } },
        bracketPredictions: { include: { predictedTeam: true }, orderBy: [{ phase: "asc" }, { matchSlot: "asc" }] },
        specialPredictions: true,
        bonuses: { include: { bonusAction: true }, orderBy: { createdAt: "desc" } },
        redemptions: { include: { prize: true }, orderBy: { createdAt: "desc" } },
        userAchievements: { include: { achievementRule: true }, orderBy: { awardedAt: "desc" } },
        referredBy: { select: { id: true, firstName: true, lastName: true, referralCode: true } },
        referrals: {
          select: { id: true, firstName: true, lastName: true, createdAt: true, emailVerified: true, referralBonusAwarded: true },
          orderBy: { createdAt: "desc" },
        },
        purchaseCodes: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const pointsBreakdown = await getUserPointsBreakdown(id);

    // Compute actual group standings for each group the user has a prediction for
    const groupIds = user.groupPredictions.map((gp) => gp.groupId);
    type GroupResultEntry = {
      firstTeam: { id: string; name: string; flagUrl?: string | null } | null;
      secondTeam: { id: string; name: string; flagUrl?: string | null } | null;
      thirdTeam: { id: string; name: string; flagUrl?: string | null } | null;
      isComplete: boolean;
    };
    const groupResults: Record<string, GroupResultEntry> = {};

    if (groupIds.length > 0) {
      const groups = await prisma.worldCupGroup.findMany({
        where: { id: { in: groupIds } },
        select: {
          id: true,
          teams: { select: { id: true, name: true, flagUrl: true } },
          matches: {
            where: { phase: "GROUP_STAGE" },
            select: { phase: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
          },
        },
      });

      for (const g of groups) {
        const teamMap = new Map(g.teams.map((t) => [t.id, t]));
        const { first, second, third } = calculateGroupQualifiers(g.teams, g.matches);
        const isComplete = g.matches.length > 0 && g.matches.every((m) => m.status === "finished");
        groupResults[g.id] = {
          firstTeam: first ? (teamMap.get(first) ?? null) : null,
          secondTeam: second ? (teamMap.get(second) ?? null) : null,
          thirdTeam: third ? (teamMap.get(third) ?? null) : null,
          isComplete,
        };
      }
    }

    const rankingPosition =
      (await prisma.user.count({ where: { totalPoints: { gt: user.totalPoints } } })) + 1;

    return NextResponse.json({ user, pointsBreakdown, groupResults, rankingPosition });
  } catch (error) {
    console.error("Participant GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.prediction.deleteMany({ where: { userId: id } }),
      prisma.groupPrediction.deleteMany({ where: { userId: id } }),
      prisma.bracketPrediction.deleteMany({ where: { userId: id } }),
      prisma.specialPrediction.deleteMany({ where: { userId: id } }),
      prisma.userBonus.deleteMany({ where: { userId: id } }),
      prisma.prizeRedemption.deleteMany({ where: { userId: id } }),
      prisma.userAchievement.deleteMany({ where: { userId: id } }),
      prisma.squadMember.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Participant DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Participant PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
