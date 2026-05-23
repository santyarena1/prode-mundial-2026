import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

// DELETE /api/admin/participants/[id]/items?type=bonus|prediction|groupPrediction|bracketPrediction&itemId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const itemId = searchParams.get("itemId");

    if (!type || !itemId) {
      return NextResponse.json({ error: "type and itemId required" }, { status: 400 });
    }

    switch (type) {
      case "bonus": {
        await prisma.userBonus.delete({ where: { id: itemId, userId } });
        await calculateUserPoints(userId);
        break;
      }
      case "prediction": {
        await prisma.prediction.delete({ where: { id: itemId, userId } });
        await calculateUserPoints(userId);
        break;
      }
      case "groupPrediction": {
        await prisma.groupPrediction.delete({ where: { id: itemId, userId } });
        await calculateUserPoints(userId);
        break;
      }
      case "bracketPrediction": {
        await prisma.bracketPrediction.delete({ where: { id: itemId, userId } });
        await calculateUserPoints(userId);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Participant item DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
