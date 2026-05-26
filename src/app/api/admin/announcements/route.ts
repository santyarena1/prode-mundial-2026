import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { sendAnnouncement } from "@/lib/email";

const schema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(60).optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const count = await prisma.user.count({
      where: { emailUnsubscribed: false, isBlocked: false },
    });

    return NextResponse.json({ recipientCount: count });
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { subject, message, ctaUrl, ctaLabel } = parsed.data;

    const users = await prisma.user.findMany({
      where: { emailUnsubscribed: false, isBlocked: false },
      select: { id: true, email: true, firstName: true },
    });

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
