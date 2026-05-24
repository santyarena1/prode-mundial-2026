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

  const [globalPreds, globalGroupPreds, globalBracketPreds] = await Promise.all([
    prisma.prediction.findMany({ where: { userId: auth.userId } }),
    prisma.groupPrediction.findMany({ where: { userId: auth.userId } }),
    prisma.bracketPrediction.findMany({ where: { userId: auth.userId } }),
  ]);

  await prisma.$transaction([
    ...globalPreds.map((p) =>
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
    ),
    ...globalGroupPreds.map((gp) =>
      prisma.squadGroupPrediction.upsert({
        where: { memberId_wcGroupId: { memberId: member.id, wcGroupId: gp.groupId } },
        create: {
          memberId: member.id,
          wcGroupId: gp.groupId,
          firstTeamId: gp.firstTeamId,
          secondTeamId: gp.secondTeamId,
          thirdTeamId: gp.thirdTeamId,
        },
        update: {
          firstTeamId: gp.firstTeamId,
          secondTeamId: gp.secondTeamId,
          thirdTeamId: gp.thirdTeamId,
        },
      })
    ),
    ...globalBracketPreds
      .filter((bp) => bp.predictedTeamId)
      .map((bp) =>
        prisma.squadBracketPrediction.upsert({
          where: { memberId_phase_matchSlot: { memberId: member.id, phase: bp.phase, matchSlot: bp.matchSlot } },
          create: { memberId: member.id, phase: bp.phase, matchSlot: bp.matchSlot, predictedTeamId: bp.predictedTeamId! },
          update: { predictedTeamId: bp.predictedTeamId! },
        })
      ),
  ]);

  const newTotal = await calculateSquadMemberPoints(member.id);
  const total = globalPreds.length + globalGroupPreds.length + globalBracketPreds.length;
  return NextResponse.json({ copied: total, totalPoints: newTotal });
}
