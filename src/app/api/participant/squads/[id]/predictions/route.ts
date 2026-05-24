import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { calculateSquadMemberPoints } from "@/lib/squad-points";

const saveSchema = z.object({
  predictions: z.array(
    z.object({
      matchId: z.string(),
      predictedHomeScore: z.number().int().min(0),
      predictedAwayScore: z.number().int().min(0),
    })
  ),
});

export async function GET(
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

  const predictions = await prisma.squadPrediction.findMany({ where: { memberId: member.id } });
  return NextResponse.json({ predictions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  await prisma.$transaction(
    parsed.data.predictions.map((p) =>
      prisma.squadPrediction.upsert({
        where: { memberId_matchId: { memberId: member.id, matchId: p.matchId } },
        create: {
          memberId: member.id,
          matchId: p.matchId,
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          predictedOutcome:
            p.predictedHomeScore > p.predictedAwayScore
              ? "home"
              : p.predictedAwayScore > p.predictedHomeScore
                ? "away"
                : "draw",
        },
        update: {
          predictedHomeScore: p.predictedHomeScore,
          predictedAwayScore: p.predictedAwayScore,
          predictedOutcome:
            p.predictedHomeScore > p.predictedAwayScore
              ? "home"
              : p.predictedAwayScore > p.predictedHomeScore
                ? "away"
                : "draw",
        },
      })
    )
  );

  const newTotal = await calculateSquadMemberPoints(member.id);
  return NextResponse.json({ saved: parsed.data.predictions.length, totalPoints: newTotal });
}
