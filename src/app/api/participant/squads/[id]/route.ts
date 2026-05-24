import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { getSquadPointRules } from "@/lib/squad-points";

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

  const squad = await prisma.squad.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, instagram: true } },
        },
        orderBy: { totalPoints: "desc" },
      },
      prizes: { where: { active: true }, orderBy: { pointsCost: "asc" } },
    },
  });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rules = await getSquadPointRules(id);

  const membersWithRedemptions = await Promise.all(
    squad.members.map(async (m) => {
      const spent = await prisma.squadRedemption.aggregate({
        where: { memberId: m.id, status: "approved" },
        _sum: { pointsSpent: true },
      });
      return { ...m, spentPoints: spent._sum.pointsSpent ?? 0 };
    })
  );

  return NextResponse.json({
    squad: { ...squad, members: membersWithRedemptions },
    myMemberId: member.id,
    myRole: member.role,
    rules,
  });
}

export async function DELETE(
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

  const squad = await prisma.squad.findUnique({ where: { id } });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (squad.createdBy === auth.userId) {
    // Creator dissolves the whole squad
    await prisma.squad.delete({ where: { id } });
    return NextResponse.json({ dissolved: true });
  }

  // Regular member leaves
  await prisma.squadMember.delete({ where: { id: member.id } });
  return NextResponse.json({ left: true });
}
