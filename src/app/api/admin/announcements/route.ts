import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { sendAnnouncement } from "@/lib/email";

const BASE_WHERE = { emailUnsubscribed: false, isBlocked: false };

async function resolveUsers(
  filterType: string,
  filterId: string | null,
  userIds: string[]
): Promise<Array<{ id: string; email: string; firstName: string }>> {
  if (filterType === "prize" && filterId) {
    const redemptions = await prisma.prizeRedemption.findMany({
      where: { prizeId: filterId },
      select: { userId: true },
      distinct: ["userId"],
    });
    const ids = redemptions.map((r) => r.userId);
    return prisma.user.findMany({
      where: { ...BASE_WHERE, id: { in: ids } },
      select: { id: true, email: true, firstName: true },
    });
  }

  if (filterType === "bonus" && filterId) {
    const bonuses = await prisma.userBonus.findMany({
      where: { bonusActionId: filterId, status: "approved" },
      select: { userId: true },
      distinct: ["userId"],
    });
    const ids = bonuses.map((b) => b.userId);
    return prisma.user.findMany({
      where: { ...BASE_WHERE, id: { in: ids } },
      select: { id: true, email: true, firstName: true },
    });
  }

  if (filterType === "individual" && userIds.length > 0) {
    return prisma.user.findMany({
      where: { ...BASE_WHERE, id: { in: userIds } },
      select: { id: true, email: true, firstName: true },
    });
  }

  return prisma.user.findMany({
    where: BASE_WHERE,
    select: { id: true, email: true, firstName: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get("filterType") || "all";
    const filterId = searchParams.get("filterId");
    const userIds = searchParams.get("userIds")?.split(",").filter(Boolean) ?? [];

    const users = await resolveUsers(filterType, filterId, userIds);
    return NextResponse.json({ recipientCount: users.length });
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const schema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(60).optional(),
  filterType: z.enum(["all", "prize", "bonus", "individual"]).default("all"),
  filterId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { subject, message, ctaUrl, ctaLabel, filterType, filterId, userIds } = parsed.data;

    const users = await resolveUsers(filterType, filterId ?? null, userIds ?? []);

    if (users.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No recipients" });
    }

    const result = await sendAnnouncement({
      users,
      subject,
      message,
      ctaUrl: ctaUrl || undefined,
      ctaLabel: ctaLabel || undefined,
    });

    return NextResponse.json({ ...result, total: users.length });
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const maxDuration = 300;
