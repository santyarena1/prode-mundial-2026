import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const season = process.env.FOOTBALL_SEASON || "2026";
    const rows = await (prisma as any).standing.findMany({
      where: { season },
      orderBy: [{ group: "asc" }, { rank: "asc" }],
    });

    // Group by group name
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.group]) grouped[row.group] = [];
      grouped[row.group].push(row);
    }

    const standings = Object.entries(grouped).map(([group, teams]) => ({ group, teams }));
    return NextResponse.json({ standings });
  } catch (error) {
    console.error("Public standings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
