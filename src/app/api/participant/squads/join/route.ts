import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const joinSchema = z.object({
  inviteCode: z.string().min(1).max(20).trim(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const squad = await prisma.squad.findUnique({
      where: { inviteCode: parsed.data.inviteCode },
      select: { id: true, name: true },
    });
    if (!squad) {
      return NextResponse.json({ error: "Código de grupo no encontrado" }, { status: 404 });
    }

    const existing = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId: squad.id, userId: auth.userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya sos miembro de este grupo", squadId: squad.id }, { status: 409 });
    }

    await prisma.squadMember.create({
      data: { squadId: squad.id, userId: auth.userId, role: "member" },
    });

    return NextResponse.json({ squadId: squad.id, squadName: squad.name }, { status: 201 });
  } catch (error) {
    console.error("Squad join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
