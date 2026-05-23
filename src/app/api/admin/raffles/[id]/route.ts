import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  prize: z.string().min(1).optional(),
  scheduledAt: z.string().optional(),
  status: z.string().optional(),
  winnerName: z.string().nullable().optional(),
  winnerInstagram: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  bonusActionId: z.string().nullable().optional(),
  earlyBirdCutoff: z.string().nullable().optional(),
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { scheduledAt, earlyBirdCutoff, ...rest } = parsed.data;
    const raffle = await prisma.weeklyRaffle.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(earlyBirdCutoff !== undefined ? { earlyBirdCutoff: earlyBirdCutoff ? new Date(earlyBirdCutoff) : null } : {}),
      },
    });
    return NextResponse.json({ raffle });
  } catch (error) {
    console.error("Admin raffle PUT error:", error);
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
    await prisma.weeklyRaffle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin raffle DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
