import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateRedemptionSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "delivered"]),
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
    const parsed = updateRedemptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const existing = await prisma.prizeRedemption.findUnique({
      where: { id },
      select: { userId: true, pointsSpent: true, prizeId: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const redemption = await prisma.prizeRedemption.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    if (parsed.data.status === "rejected" && existing.status !== "rejected") {
      // Refund points and restore stock (stock > 0 = limited prize; 0 = unlimited, nothing to restore)
      await Promise.all([
        prisma.user.update({
          where: { id: existing.userId },
          data: { spentPoints: { decrement: existing.pointsSpent } },
        }),
        prisma.prize.updateMany({
          where: { id: existing.prizeId, stock: { gt: 0 } },
          data: { stock: { increment: 1 } },
        }),
      ]);
    }

    return NextResponse.json({ redemption });
  } catch (error) {
    console.error("Redemption PUT error:", error);
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
    const r = await prisma.prizeRedemption.findUnique({ where: { id } });
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If approved/delivered, restore stock before deleting
    const needsStockRestore = r.status === "approved" || r.status === "delivered";
    await prisma.$transaction([
      prisma.prizeRedemption.delete({ where: { id } }),
      prisma.user.update({
        where: { id: r.userId },
        data: { spentPoints: { decrement: r.pointsSpent } },
      }),
      ...(needsStockRestore
        ? [prisma.prize.updateMany({ where: { id: r.prizeId, stock: { gt: 0 } }, data: { stock: { increment: 1 } } })]
        : []
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Redemption DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
