import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        group: true,
      },
      orderBy: { startDate: "asc" },
    });

    // Group by phase
    const grouped: Record<string, typeof matches> = {};
    for (const match of matches) {
      if (!grouped[match.phase]) {
        grouped[match.phase] = [];
      }
      grouped[match.phase].push(match);
    }

    const fixture = Object.entries(grouped).map(([phase, phaseMatches]) => ({
      phase,
      matches: phaseMatches,
    }));

    return NextResponse.json({ fixture });
  } catch (error) {
    console.error("Public fixture GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
