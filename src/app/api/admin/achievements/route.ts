import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { DEFAULT_ACHIEVEMENTS, DEFAULT_POINT_RULES } from "@/lib/points";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const achievements = await prisma.achievementRule.findMany({
      orderBy: { points: "asc" },
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Achievements GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Seed/upsert all achievement rules and update point rules to new values
export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Upsert point rules with new values
    for (const [key, rule] of Object.entries(DEFAULT_POINT_RULES)) {
      await prisma.pointRule.upsert({
        where: { key },
        update: { label: rule.label, points: rule.points },
        create: { key, label: rule.label, points: rule.points },
      });
    }

    // Upsert achievement rules
    for (const [key, rule] of Object.entries(DEFAULT_ACHIEVEMENTS)) {
      await prisma.achievementRule.upsert({
        where: { key },
        update: { name: rule.name, description: rule.description, points: rule.points },
        create: { key, name: rule.name, description: rule.description, points: rule.points },
      });
    }

    const achievements = await prisma.achievementRule.findMany({ orderBy: { points: "asc" } });
    const pointRules = await prisma.pointRule.findMany({ orderBy: { key: "asc" } });

    return NextResponse.json({ success: true, achievements: achievements.length, pointRules: pointRules.length });
  } catch (error) {
    console.error("Achievements POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
