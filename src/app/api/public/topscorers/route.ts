import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const season = process.env.FOOTBALL_SEASON || "2026";
    const scorers = await (prisma as any).topScorer.findMany({
      where: { season },
      orderBy: { rank: "asc" },
      take: 20,
    });
    return NextResponse.json({ scorers });
  } catch (error) {
    console.error("Public topscorers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
