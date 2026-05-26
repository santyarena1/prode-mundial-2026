import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateBonusActionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  points: z.number().int().min(0).optional(),
  multiplier: z.number().optional(),
  sponsorId: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  active: z.boolean().optional(),
  actionUrl: z.string().nullable().optional(),
  requiredHandles: z.string().nullable().optional(),
  allowMultipleClaims: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
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
    const parsed = updateBonusActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const bonusAction = await prisma.bonusAction.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ bonusAction });
  } catch (error) {
    console.error("BonusAction PUT error:", error);
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
    await prisma.bonusAction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("BonusAction DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
