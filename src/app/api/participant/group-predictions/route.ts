import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const groupPredictionSchema = z.object({
  groupId: z.string().min(1),
  firstTeamId: z.string().optional(),
  secondTeamId: z.string().optional(),
  thirdTeamId: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groupPredictions = await prisma.groupPrediction.findMany({
      where: { userId: auth.userId },
      include: { group: true, firstTeam: true, secondTeam: true, thirdTeam: true },
    });

    return NextResponse.json({ groupPredictions });
  } catch (error) {
    console.error("GroupPredictions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = groupPredictionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { groupId, ...rest } = parsed.data;

    const group = await prisma.worldCupGroup.findUnique({ where: { id: groupId } });
    if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

    const now = new Date();
    const prediction = await prisma.groupPrediction.upsert({
      where: { userId_groupId: { userId: auth.userId, groupId } },
      update: { ...rest, isLocked: true, lockedAt: now },
      create: { userId: auth.userId, groupId, ...rest, isLocked: true, lockedAt: now },
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("GroupPredictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
