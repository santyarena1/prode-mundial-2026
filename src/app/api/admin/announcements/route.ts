import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { sendAnnouncement } from "@/lib/email";

const BASE_WHERE = { emailUnsubscribed: false, isBlocked: false };

// Mismo cutoff que el cliente: las predicciones cierran 10 min antes del kickoff.
const PREDICTION_CUTOFF_MS = 10 * 60 * 1000;

async function resolveUsersWithMissingPredictions(): Promise<
  Array<{ id: string; email: string; firstName: string }>
> {
  const cutoff = new Date(Date.now() + PREDICTION_CUTOFF_MS);

  // Partidos cuya ventana de predicción sigue abierta.
  const openMatches = await prisma.match.findMany({
    where: { status: "scheduled", startDate: { gt: cutoff } },
    select: { id: true },
  });

  if (openMatches.length === 0) return [];

  const matchIds = openMatches.map((m) => m.id);
  const totalOpen = matchIds.length;

  // Por usuario: cantidad de predicciones completas (con ambos scores) en esos partidos.
  const counts = await prisma.prediction.groupBy({
    by: ["userId"],
    where: {
      matchId: { in: matchIds },
      predictedHomeScore: { not: null },
      predictedAwayScore: { not: null },
    },
    _count: { _all: true },
  });

  const completeByUser = new Map(counts.map((c) => [c.userId, c._count._all]));

  const allUsers = await prisma.user.findMany({
    where: BASE_WHERE,
    select: { id: true, email: true, firstName: true },
  });

  return allUsers.filter((u) => (completeByUser.get(u.id) ?? 0) < totalOpen);
}

async function resolveUsers(
  filterType: string,
  filterId: string | null,
  userIds: string[]
): Promise<Array<{ id: string; email: string; firstName: string }>> {
  if (filterType === "missing_predictions") {
    return resolveUsersWithMissingPredictions();
  }

  if (filterType === "prize" && filterId) {
    const redemptions = await prisma.prizeRedemption.findMany({
      where: { prizeId: filterId },
      select: { userId: true },
      distinct: ["userId"],
    });
    const ids = redemptions.map((r: { userId: string }) => r.userId);
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
    const ids = bonuses.map((b: { userId: string }) => b.userId);
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
  message: z.string().min(1),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(60).optional(),
  filterType: z.enum(["all", "prize", "bonus", "individual", "missing_predictions"]).default("all"),
  filterId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  rawHtml: z.boolean().optional().default(false),
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

    const { subject, message, ctaUrl, ctaLabel, filterType, filterId, userIds, rawHtml } = parsed.data;

    const users = await resolveUsers(filterType, filterId ?? null, userIds ?? []);

    if (users.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No recipients" });
    }

    // Creamos el log ANTES de enviar para que siempre quede registro (aunque la
    // función se corte por timeout a mitad del envío masivo).
    const log = await prisma.emailLog.create({
      data: {
        subject,
        message,
        ctaUrl: ctaUrl || null,
        ctaLabel: ctaLabel || null,
        recipientCount: users.length,
        sentCount: 0,
        failedCount: 0,
      },
    });

    const result = await sendAnnouncement({
      users,
      subject,
      message,
      ctaUrl: ctaUrl || undefined,
      ctaLabel: ctaLabel || undefined,
      rawHtml,
    });

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { sentCount: result.sent, failedCount: result.failed },
    });

    return NextResponse.json({ ...result, total: users.length });
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const maxDuration = 300;
