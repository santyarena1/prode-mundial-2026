import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateUserSchema = z.object({
  isBlocked: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        predictions: {
          include: { match: { include: { homeTeam: true, awayTeam: true } } },
        },
        groupPredictions: { include: { group: true, firstTeam: true, secondTeam: true } },
        bracketPredictions: true,
        specialPredictions: true,
        bonuses: { include: { bonusAction: true } },
        redemptions: { include: { prize: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Participant GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Participant PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
