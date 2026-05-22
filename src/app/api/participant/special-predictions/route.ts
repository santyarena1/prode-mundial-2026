import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const specialPredictionSchema = z.object({
  type: z.string().min(1),
  predictedValue: z.string().min(1),
});

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const specialPredictions = await prisma.specialPrediction.findMany({
      where: { userId: auth.userId },
    });

    return NextResponse.json({ specialPredictions });
  } catch (error) {
    console.error("SpecialPredictions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = specialPredictionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { type, predictedValue } = parsed.data;

    const prediction = await prisma.specialPrediction.upsert({
      where: { userId_type: { userId: auth.userId, type } },
      update: { predictedValue },
      create: { userId: auth.userId, type, predictedValue },
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("SpecialPredictions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
