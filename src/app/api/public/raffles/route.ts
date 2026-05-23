import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const raffles = await prisma.weeklyRaffle.findMany({
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json({ raffles });
  } catch (error) {
    console.error("Raffles GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
