import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { nanoid } from "nanoid";

const createSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
  isHardcore: z.boolean().optional(),
});

export async function GET() {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.squadMember.findMany({
    where: { userId: auth.userId },
    include: {
      squad: {
        include: {
          _count: { select: { members: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = await prisma.squadInvite.findMany({
    where: { invitedUserId: auth.userId, status: "pending" },
    include: {
      squad: { select: { id: true, name: true } },
      inviter: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    squads: memberships.map((m) => ({
      ...m.squad,
      myMemberId: m.id,
      myRole: m.role,
      myPoints: m.totalPoints,
    })),
    pendingInvites: invites,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const { name, description, isHardcore = false } = parsed.data;

  const squad = await prisma.$transaction(async (tx) => {
    const s = await tx.squad.create({
      data: {
        name,
        description,
        isHardcore,
        createdBy: auth.userId,
        inviteCode: nanoid(10),
      },
    });
    await tx.squadMember.create({
      data: { squadId: s.id, userId: auth.userId, role: "admin" },
    });
    return s;
  });

  return NextResponse.json({ squad }, { status: 201 });
}
