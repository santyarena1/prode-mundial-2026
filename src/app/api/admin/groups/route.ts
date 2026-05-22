import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createGroupSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groups = await prisma.worldCupGroup.findMany({
      include: { teams: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Groups GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const group = await prisma.worldCupGroup.create({ data: parsed.data });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Groups POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
