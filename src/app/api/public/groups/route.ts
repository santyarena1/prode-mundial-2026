import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const groups = await prisma.worldCupGroup.findMany({
      orderBy: { name: "asc" },
      include: {
        teams: {
          orderBy: { name: "asc" },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            events: { orderBy: { minute: "asc" } },
          },
          orderBy: { startDate: "asc" },
          where: { phase: "GROUP_STAGE" },
        },
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Public groups GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
