import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

// PUT — cast or update vote (approve: true/false)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: squadId } = await params;
  const { approve } = await request.json();

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId, userId: auth.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const deleteRequest = await prisma.squadDeleteRequest.findUnique({ where: { squadId } });
  if (!deleteRequest) return NextResponse.json({ error: "No pending delete request" }, { status: 404 });

  await prisma.squadDeleteVote.upsert({
    where: { requestId_userId: { requestId: deleteRequest.id, userId: auth.userId } },
    create: { requestId: deleteRequest.id, userId: auth.userId, approve },
    update: { approve },
  });

  if (!approve) {
    // Any rejection cancels the request
    await prisma.squadDeleteRequest.delete({ where: { squadId } });
    return NextResponse.json({ result: "rejected" });
  }

  // Check if all members have approved
  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    include: { members: true },
  });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const votes = await prisma.squadDeleteVote.findMany({
    where: { requestId: deleteRequest.id, approve: true },
  });

  if (votes.length >= squad.members.length) {
    await prisma.squad.delete({ where: { id: squadId } });
    return NextResponse.json({ result: "dissolved" });
  }

  const pending = squad.members.length - votes.length;
  return NextResponse.json({ result: "pending", pendingVotes: pending });
}
