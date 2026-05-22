import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const createPrizeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  requiredPoints: z.number().int().min(0),
  stock: z.number().int().min(0),
  sponsorId: z.string().optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prizes = await prisma.prize.findMany({
      include: { sponsor: true },
      orderBy: { requiredPoints: "asc" },
    });

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error("Prizes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createPrizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { expiresAt, ...rest } = parsed.data;
    const prize = await prisma.prize.create({
      data: { ...rest, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
    });

    return NextResponse.json({ prize }, { status: 201 });
  } catch (error) {
    console.error("Prizes POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
