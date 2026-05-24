import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const squads = await prisma.squad.findMany({
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { members: true, prizes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ squads });
}
