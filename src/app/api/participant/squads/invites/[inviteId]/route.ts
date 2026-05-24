import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteId } = await params;

  const invite = await prisma.squadInvite.findUnique({
    where: { id: inviteId },
    include: { squad: { select: { id: true, name: true } } },
  });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.invitedUserId !== auth.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invitación ya procesada" }, { status: 400 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  if (parsed.data.action === "decline") {
    await prisma.squadInvite.update({ where: { id: inviteId }, data: { status: "declined" } });
    return NextResponse.json({ declined: true });
  }

  // Accept
  await prisma.$transaction(async (tx) => {
    await tx.squadInvite.update({ where: { id: inviteId }, data: { status: "accepted" } });
    await tx.squadMember.create({
      data: { squadId: invite.squadId, userId: auth.userId, role: "member" },
    });
    // Notify inviter
    await tx.notification.create({
      data: {
        userId: invite.invitedBy,
        type: "squad_joined",
        title: "¡Alguien se unió a tu grupo!",
        body: `Un usuario aceptó tu invitación y se unió al grupo "${invite.squad.name}".`,
        data: JSON.stringify({ squadId: invite.squadId }),
      },
    });
  });

  return NextResponse.json({ accepted: true, squadId: invite.squadId });
}
