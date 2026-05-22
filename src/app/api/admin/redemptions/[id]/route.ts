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
          data: {
            spentPoints: {
              decrement: redemptionWithUser.pointsSpent,
            },
            totalPoints: {
              increment: redemptionWithUser.pointsSpent,
            },
          },
        });
      }
    }

    return NextResponse.json({ redemption });
  } catch (error) {
    console.error("Redemption PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
