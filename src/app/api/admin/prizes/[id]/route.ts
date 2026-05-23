import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updatePrizeSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  requiredPoints: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  sponsorId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  prizeType: z.string().optional(),
  maxPerUser: z.number().int().optional().nullable(),
  maxTotal: z.number().int().optional().nullable(),
  expiresAt: z.string().optional(),
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
    const parsed = updatePrizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { expiresAt, sponsorId, ...rest } = parsed.data;
    const prize = await prisma.prize.update({
      where: { id },
      data: {
        ...rest,
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
        ...(sponsorId !== undefined ? { sponsorId: sponsorId ?? null } : {}),
      },
    });

    return NextResponse.json({ prize });
  } catch (error) {
    console.error("Prize PUT error:", error);
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
    await prisma.prize.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Prize DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
