import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const schema = z.object({ email: z.string().email() });

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
  if (!parsed.success) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) return NextResponse.json({ error: "No existe un usuario con ese email" }, { status: 404 });

  if (target.id === auth.userId) {
    return NextResponse.json({ error: "No podés invitarte a vos mismo" }, { status: 400 });
  }

  const alreadyMember = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: target.id } },
  });
  if (alreadyMember) return NextResponse.json({ error: "Ya es miembro del grupo" }, { status: 400 });

  const existing = await prisma.squadInvite.findUnique({
    where: { squadId_invitedUserId: { squadId: id, invitedUserId: target.id } },
  });
  if (existing?.status === "pending") {
    return NextResponse.json({ error: "Ya tiene una invitación pendiente" }, { status: 400 });
  }

  const squad = await prisma.squad.findUnique({ where: { id }, select: { name: true } });
  const inviter = await prisma.user.findUnique({ where: { id: auth.userId }, select: { firstName: true, lastName: true } });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.squadInvite.update({ where: { id: existing.id }, data: { status: "pending" } });
    } else {
      await tx.squadInvite.create({
        data: { squadId: id, invitedBy: auth.userId, invitedUserId: target.id },
      });
    }

    await tx.notification.create({
      data: {
        userId: target.id,
        type: "squad_invite",
        title: "¡Te invitaron a un grupo!",
        body: `${inviter?.firstName} ${inviter?.lastName} te invitó al grupo "${squad?.name}". Aceptá o rechazá desde la sección Grupos.`,
        data: JSON.stringify({ squadId: id }),
      },
    });
  });

  return NextResponse.json({ invited: true });
}
