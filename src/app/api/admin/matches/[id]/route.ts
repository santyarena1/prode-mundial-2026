import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateMatchSchema = z.object({
  matchCode: z.string().optional(),
  phase: z.string().optional(),
  groupId: z.string().optional(),
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  homePlaceholder: z.string().optional(),
  awayPlaceholder: z.string().optional(),
  venue: z.string().optional(),
  startDate: z.string().optional(),
  homeScore: z.number().int().optional(),
  awayScore: z.number().int().optional(),
  realOutcome: z.string().optional(),
  winnerTeamId: z.string().optional(),
  status: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { startDate, ...rest } = parsed.data;
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
      },
    });

    return NextResponse.json({ match });
  } catch (error) {
    console.error("Match PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.match.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Match DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
