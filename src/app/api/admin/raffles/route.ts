import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prize: z.string().min(1),
  scheduledAt: z.string(),
  status: z.string().optional(),
  winnerName: z.string().nullable().optional(),
  winnerInstagram: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  bonusActionId: z.string().nullable().optional(),
  earlyBirdCutoff: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raffles = await prisma.weeklyRaffle.findMany({
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json({ raffles });
  } catch (error) {
    console.error("Admin raffles GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { scheduledAt, earlyBirdCutoff, ...rest } = parsed.data;
    const raffle = await prisma.weeklyRaffle.create({
      data: {
        ...rest,
        scheduledAt: new Date(scheduledAt),
        earlyBirdCutoff: earlyBirdCutoff ? new Date(earlyBirdCutoff) : null,
      },
    });
    return NextResponse.json({ raffle }, { status: 201 });
  } catch (error) {
    console.error("Admin raffles POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
