import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { getSquadPointRules } from "@/lib/squad-points";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const squad = await prisma.squad.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, instagram: true } },
          predictions: {
            include: { match: { include: { homeTeam: true, awayTeam: true } } },
            orderBy: { createdAt: "asc" },
          },
          groupPreds: {
            include: {
              wcGroup: true,
              firstTeam: true,
              secondTeam: true,
            },
          },
          redemptions: {
            include: { prize: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { totalPoints: "desc" },
      },
      prizes: {
        include: { _count: { select: { redemptions: true } } },
        orderBy: { createdAt: "asc" },
      },
      pointRules: true,
    },
  });

  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const defaultRules = await getSquadPointRules(id);

  return NextResponse.json({ squad, defaultRules });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.squad.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
