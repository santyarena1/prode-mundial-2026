import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const schema = z.object({
  phase: z.string().min(1),
  matchSlot: z.string().min(1),
  predictedTeamId: z.string().min(1),
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

  const bracketPreds = await prisma.squadBracketPrediction.findMany({
    where: { memberId: member.id },
    include: { predictedTeam: true },
  });

  return NextResponse.json({ bracketPreds });
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { phase, matchSlot, predictedTeamId } = parsed.data;

  const pred = await prisma.squadBracketPrediction.upsert({
    where: { memberId_phase_matchSlot: { memberId: member.id, phase, matchSlot } },
    create: { memberId: member.id, phase, matchSlot, predictedTeamId },
    update: { predictedTeamId },
  });

  return NextResponse.json({ pred });
}
