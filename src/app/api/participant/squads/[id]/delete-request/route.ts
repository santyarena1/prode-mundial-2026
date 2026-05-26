import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

// POST — creator initiates a delete request (casts their own vote as yes)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: squadId } = await params;

  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: { members: true },
  });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (squad.createdBy !== auth.userId) {
    return NextResponse.json({ error: "Solo el creador puede iniciar la disolución" }, { status: 403 });
  }

  // If only the creator is a member, just delete directly
  const otherMembers = squad.members.filter((m) => m.userId !== auth.userId);
  if (otherMembers.length === 0) {
    await prisma.squad.delete({ where: { id: squadId } });
    return NextResponse.json({ dissolved: true });
  }

  // Upsert the delete request and add creator's vote
  const request = await prisma.squadDeleteRequest.upsert({
    where: { squadId },
    create: { squadId, requestedBy: auth.userId },
    update: { requestedBy: auth.userId, createdAt: new Date() },
  });

  // Creator auto-votes yes
  await prisma.squadDeleteVote.upsert({
    where: { requestId_userId: { requestId: request.id, userId: auth.userId } },
    create: { requestId: request.id, userId: auth.userId, approve: true },
    update: { approve: true },
  });

  // Create notifications for all other members
  await prisma.notification.createMany({
    data: otherMembers.map((m) => ({
      userId: m.userId,
      type: "squad_delete_request",
      title: "Solicitud de disolución de grupo",
      body: `El admin de "${squad.name}" quiere disolver el grupo. Accedé al grupo para votar.`,
      data: JSON.stringify({ squadId }),
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ requestId: request.id, pendingVotes: otherMembers.length });
}

// DELETE — cancel the pending request (only creator)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: squadId } = await params;

  const squad = await prisma.squad.findUnique({ where: { id: squadId } });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (squad.createdBy !== auth.userId) {
    return NextResponse.json({ error: "Solo el creador puede cancelar" }, { status: 403 });
  }

  await prisma.squadDeleteRequest.deleteMany({ where: { squadId } });
  return NextResponse.json({ cancelled: true });
}
