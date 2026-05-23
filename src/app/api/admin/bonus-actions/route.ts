import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createBonusActionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  points: z.number().int().min(0),
  multiplier: z.number().optional(),
  sponsorId: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  active: z.boolean().optional(),
  actionUrl: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bonusActions = await prisma.bonusAction.findMany({
      include: { sponsor: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bonusActions });
  } catch (error) {
    console.error("BonusActions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createBonusActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const bonusAction = await prisma.bonusAction.create({ data: parsed.data });
    return NextResponse.json({ bonusAction }, { status: 201 });
  } catch (error) {
    console.error("BonusActions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
