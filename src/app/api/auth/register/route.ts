import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { signUserToken } from "@/lib/auth";
import { USER_COOKIE, COOKIE_OPTIONS } from "@/lib/cookies";
import { sendWelcomeEmail } from "@/lib/email";
import { calculateUserPoints } from "@/lib/points";

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
  instagram: z.string().optional(),
  inviteCode: z.string().optional(),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: "Must accept terms",
  }),
});

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

const MAX_ACCOUNTS_PER_IP = 3;
const RATE_WINDOW_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    // Rate limit: max MAX_ACCOUNTS_PER_IP registrations per IP in RATE_WINDOW_HOURS
    if (ip !== "unknown") {
      const since = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000);
      const recentCount = await prisma.user.count({
        where: { registrationIp: ip, createdAt: { gte: since } },
      });
      if (recentCount >= MAX_ACCOUNTS_PER_IP) {
        return NextResponse.json(
          { error: `Límite de registros alcanzado. Máximo ${MAX_ACCOUNTS_PER_IP} cuentas por red en ${RATE_WINDOW_HOURS}h.` },
          { status: 429 }
        );
      }
    }

    const { firstName, lastName, instagram, acceptedTerms, password, inviteCode } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone.trim();

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Find referrer if invite code was provided
    let referrer: { id: string } | null = null;
    if (inviteCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: inviteCode.trim().toUpperCase() },
        select: { id: true },
      });
    }

    // Generate unique referral code for new user
    let referralCode = generateReferralCode();
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode();
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        passwordHash,
        instagram: instagram || null,
        acceptedTerms,
        registrationIp: ip !== "unknown" ? ip : null,
        referralCode,
        referredById: referrer?.id ?? null,
      },
    });

    // Award referral points to the person who invited
    if (referrer) {
      const referralSetting = await prisma.setting.findUnique({ where: { key: "referral_points" } });
      const REFERRAL_POINTS = referralSetting ? (parseInt(referralSetting.value) || 200) : 200;
      await prisma.user.update({
        where: { id: referrer.id },
        data: { referralPoints: { increment: REFERRAL_POINTS } },
      });
      calculateUserPoints(referrer.id).catch(() => {});
    }

    // Early bird: auto-grant raffle entry if registering before cutoff
    const earlyBirdRaffle = await prisma.weeklyRaffle.findFirst({
      where: {
        earlyBirdCutoff: { gt: new Date() },
        bonusActionId: { not: null },
        status: { in: ["upcoming", "live"] },
      },
      orderBy: { earlyBirdCutoff: "asc" },
    });
    if (earlyBirdRaffle?.bonusActionId) {
      await prisma.$transaction([
        prisma.userBonus.create({
          data: {
            userId: user.id,
            bonusActionId: earlyBirdRaffle.bonusActionId,
            status: "approved",
            pointsEarned: 0,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { earlyBirdGranted: true },
        }),
      ]);
    }

    sendWelcomeEmail({ firstName: user.firstName, lastName: user.lastName, email: user.email })
      .catch((err) => console.error("[email] Failed to send welcome email:", err));

    const token = signUserToken(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          totalPoints: user.totalPoints,
        },
      },
      { status: 201 }
    );

    response.cookies.set(USER_COOKIE, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
