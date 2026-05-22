import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    // First try up to 3 featured prizes, then fall back to first 3 active prizes by sortOrder
    let prizes = await prisma.prize.findMany({
      where: { active: true, featured: true },
      include: { sponsor: true },
      orderBy: [{ sortOrder: "asc" }, { requiredPoints: "asc" }],
      take: 3,
    });

    if (prizes.length < 3) {
      const extra = await prisma.prize.findMany({
        where: { active: true, featured: false, id: { notIn: prizes.map(p => p.id) } },
        include: { sponsor: true },
        orderBy: [{ sortOrder: "asc" }, { requiredPoints: "asc" }],
        take: 3 - prizes.length,
      });
      prizes = [...prizes, ...extra];
    }

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Featured prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
