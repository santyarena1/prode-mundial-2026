import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";

const BATCH_SIZE = 10;

export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({ select: { id: true } });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((u) => calculateUserPoints(u.id)));
      succeeded += results.filter((r) => r.status === "fulfilled").length;
      failed += results.filter((r) => r.status === "rejected").length;
    }

    return NextResponse.json({ success: true, total: users.length, succeeded, failed });
  } catch (error) {
    console.error("Recalculate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
