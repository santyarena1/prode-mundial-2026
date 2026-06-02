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

    const redemption = await prisma.prizeRedemption.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    // If rejected, refund points to user
    if (parsed.data.status === "rejected") {
      const redemptionWithUser = await prisma.prizeRedemption.findUnique({
        where: { id },
        select: { userId: true, pointsSpent: true },
      });
      if (redemptionWithUser) {
        await prisma.user.update({
          where: { id: redemptionWithUser.userId },
          data: { spentPoints: { decrement: redemptionWithUser.pointsSpent } },
        });
      }
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

    await prisma.$transaction([
      prisma.prizeRedemption.delete({ where: { id } }),
      prisma.user.update({
        where: { id: r.userId },
        data: { spentPoints: { decrement: r.pointsSpent } },
      }),
      prisma.prize.update({
        where: { id: r.prizeId },
        data: { stock: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Redemption DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
