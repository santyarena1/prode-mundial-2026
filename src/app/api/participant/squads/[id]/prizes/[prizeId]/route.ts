import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, prizeId } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member || member.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden eliminar premios" }, { status: 403 });
  }

  await prisma.squadPrize.update({ where: { id: prizeId }, data: { active: false } });
  return NextResponse.json({ deleted: true });
}
