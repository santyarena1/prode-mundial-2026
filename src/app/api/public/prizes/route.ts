import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const prizes = await prisma.prize.findMany({
      where: { active: true },
      include: { sponsor: true },
      orderBy: { requiredPoints: "asc" },
    });

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Public prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
