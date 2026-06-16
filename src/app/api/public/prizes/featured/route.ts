import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    let prizes = await prisma.prize.findMany({
      where: { active: true, featured: true },
      include: { sponsor: true },
      orderBy: { requiredPoints: "asc" },
      take: 4,
    });

    if (prizes.length < 4) {
      const extra = await prisma.prize.findMany({
        where: { active: true, featured: false, id: { notIn: prizes.map(p => p.id) } },
        include: { sponsor: true },
        orderBy: { requiredPoints: "asc" },
        take: 4 - prizes.length,
      });
      prizes = [...prizes, ...extra];
    }

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Featured prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
