import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createMatchSchema = z.object({
  matchCode: z.string().min(1),
  phase: z.string().min(1),
  groupId: z.string().optional(),
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  homePlaceholder: z.string().optional(),
  awayPlaceholder: z.string().optional(),
  venue: z.string().optional(),
  startDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const phase = searchParams.get("phase");

    const matches = await prisma.match.findMany({
      where: phase ? { phase } : undefined,
      include: {
        homeTeam: true,
        awayTeam: true,
        group: true,
        winnerTeam: true,
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Matches GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { startDate, ...rest } = parsed.data;
    const match = await prisma.match.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
      },
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    console.error("Matches POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
