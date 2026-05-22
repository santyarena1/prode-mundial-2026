import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({ select: { id: true } });
    const results = await Promise.allSettled(
      users.map((u) => calculateUserPoints(u.id))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      total: users.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("Recalculate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
