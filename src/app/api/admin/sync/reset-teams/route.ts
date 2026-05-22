import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/cookies";
import prisma from "@/lib/db";
import { syncTeams, syncFixtures } from "@/lib/sync";

// One-time endpoint: wipes all teams + seed matches, then re-syncs from API
export async function POST(request: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Delete seed/manual matches (externalId = null) with no predictions
    const seedMatches = await prisma.match.findMany({
      where: { externalId: null },
      select: { id: true, predictions: { select: { id: true }, take: 1 } },
    });
    const toDeleteMatches = seedMatches.filter((m) => m.predictions.length === 0).map((m) => m.id);
    if (toDeleteMatches.length > 0) {
      await prisma.matchEvent.deleteMany({ where: { matchId: { in: toDeleteMatches } } });
      await prisma.match.deleteMany({ where: { id: { in: toDeleteMatches } } });
    }

    // 2. Nullify team references on remaining matches so we can delete teams
    await prisma.match.updateMany({
      data: { homeTeamId: null, awayTeamId: null, winnerTeamId: null },
    });

    // 3. Nullify team refs in GroupPrediction
    await prisma.groupPrediction.updateMany({
      data: { firstTeamId: null, secondTeamId: null },
    });

    // 4. Delete all BracketPrediction rows (they reference teams, can't nullify)
    await prisma.bracketPrediction.deleteMany({});

    // 5. Delete all teams
    const deletedTeams = await prisma.team.deleteMany({});

    // 6. Re-sync teams + fixtures from API
    const teamsResult = await syncTeams();
    const fixturesResult = await syncFixtures();

    return NextResponse.json({
      deleted: { matches: toDeleteMatches.length, teams: deletedTeams.count },
      teams: teamsResult,
      fixtures: fixturesResult,
    });
  } catch (error: any) {
    console.error("Reset teams error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
