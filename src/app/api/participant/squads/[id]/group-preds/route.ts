import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const schema = z.object({
  wcGroupId: z.string().min(1),
  firstTeamId: z.string().optional().nullable(),
  secondTeamId: z.string().optional().nullable(),
  thirdTeamId: z.string().optional().nullable(),
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

  const groupPreds = await prisma.squadGroupPrediction.findMany({
    where: { memberId: member.id },
    include: { wcGroup: true, firstTeam: true, secondTeam: true, thirdTeam: true },
  });

  return NextResponse.json({ groupPreds });
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

  const { wcGroupId, firstTeamId, secondTeamId, thirdTeamId } = parsed.data;

  const group = await prisma.worldCupGroup.findUnique({ where: { id: wcGroupId } });
  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

  const pred = await prisma.squadGroupPrediction.upsert({
    where: { memberId_wcGroupId: { memberId: member.id, wcGroupId } },
    create: {
      memberId: member.id,
      wcGroupId,
      firstTeamId: firstTeamId ?? null,
      secondTeamId: secondTeamId ?? null,
      thirdTeamId: thirdTeamId ?? null,
    },
    update: {
      firstTeamId: firstTeamId ?? null,
      secondTeamId: secondTeamId ?? null,
      thirdTeamId: thirdTeamId ?? null,
    },
  });

  return NextResponse.json({ pred });
}
