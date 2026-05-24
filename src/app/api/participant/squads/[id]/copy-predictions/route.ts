import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { calculateSquadMemberPoints } from "@/lib/squad-points";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const globalPreds = await prisma.prediction.findMany({ where: { userId: auth.userId } });

  await prisma.$transaction(
    globalPreds.map((p) =>
      prisma.squadPrediction.upsert({
        where: { memberId_matchId: { memberId: member.id, matchId: p.matchId } },
        create: {
          memberId: member.id,
          matchId: p.matchId,
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          predictedOutcome: p.predictedOutcome ?? undefined,
        },
        update: {
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          predictedOutcome: p.predictedOutcome ?? undefined,
        },
      })
    )
  );

  const newTotal = await calculateSquadMemberPoints(member.id);
  return NextResponse.json({ copied: globalPreds.length, totalPoints: newTotal });
}
