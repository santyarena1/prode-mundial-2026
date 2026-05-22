import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createTeamSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(2).max(5),
  flagUrl: z.string().optional(),
  groupId: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const teams = await prisma.team.findMany({
      include: { group: true },
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Teams GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const team = await prisma.team.create({ data: parsed.data });
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Teams POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
