import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { DEFAULT_POINT_RULES } from "@/lib/points";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rules = await prisma.pointRule.findMany({ orderBy: { key: "asc" } });

    // If no rules in DB yet, return defaults as preview
    if (rules.length === 0) {
      const defaults = Object.entries(DEFAULT_POINT_RULES).map(([key, val]) => ({
        id: key,
        key,
        label: val.label,
        points: val.points,
        active: true,
      }));
      return NextResponse.json({ pointRules: defaults });
    }

    return NextResponse.json({ pointRules: rules });
  } catch (error) {
    console.error("Point rules GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
    }

    for (const rule of rules) {
      if (!rule.key) continue;
      await prisma.pointRule.upsert({
        where: { key: rule.key },
        update: { points: rule.points, active: rule.active ?? true },
        create: {
          key: rule.key,
          label: rule.label || rule.key,
          points: rule.points,
          active: rule.active ?? true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Point rules PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
