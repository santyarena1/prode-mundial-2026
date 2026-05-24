import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
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

    const existing = await prisma.purchaseCode.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Solo se pueden revisar códigos pendientes" }, { status: 400 });
    }

    if (!existing.userId) {
      return NextResponse.json({ error: "El código no tiene usuario asignado" }, { status: 400 });
    }

    if (parsed.data.status === "approved") {
      const updated = await prisma.purchaseCode.update({
        where: { id },
        data: {
          status: "redeemed",
          redeemedAt: new Date(),
        },
      });
      await calculateUserPoints(existing.userId);
      return NextResponse.json({ purchaseCode: updated });
    }

    const updated = await prisma.purchaseCode.update({
      where: { id },
      data: {
        status: "rejected",
        userId: null,
      },
    });

    return NextResponse.json({ purchaseCode: updated });
  } catch (error) {
    console.error("Admin purchase code PUT error:", error);
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
    const existing = await prisma.purchaseCode.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.purchaseCode.delete({ where: { id } });

    // Recalculate points if the code had already been redeemed
    if (existing.status === "redeemed" && existing.userId) {
      await calculateUserPoints(existing.userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin purchase code DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
