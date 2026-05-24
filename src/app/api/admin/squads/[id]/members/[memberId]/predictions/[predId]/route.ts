import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateSquadMemberPoints } from "@/lib/squad-points";

const updateSchema = z.object({
  predictedHomeScore: z.number().int().min(0),
  predictedAwayScore: z.number().int().min(0),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string; predId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { predId, memberId } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const { predictedHomeScore, predictedAwayScore } = parsed.data;
  const outcome = predictedHomeScore > predictedAwayScore ? "home" : predictedAwayScore > predictedHomeScore ? "away" : "draw";

  const pred = await prisma.squadPrediction.update({
    where: { id: predId },
    data: { predictedHomeScore, predictedAwayScore, predictedOutcome: outcome },
  });

  await calculateSquadMemberPoints(memberId);
  return NextResponse.json({ prediction: pred });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string; predId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { predId, memberId } = await params;
  await prisma.squadPrediction.delete({ where: { id: predId } });
  await calculateSquadMemberPoints(memberId);
  return NextResponse.json({ deleted: true });
}
