import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { sendEmailVerification } from "@/lib/email";

const VERIFICATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 min

export async function POST() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        firstName: true,
        email: true,
        emailVerified: true,
        emailVerificationExpiry: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    // Cooldown: only allow resend if the previous token was issued > 1 min ago
    if (user.emailVerificationExpiry) {
      const issuedAt = user.emailVerificationExpiry.getTime() - VERIFICATION_EXPIRY_MS;
      if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          { error: "Esperá un minuto antes de pedir otro email" },
          { status: 429 }
        );
      }
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + VERIFICATION_EXPIRY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token, emailVerificationExpiry: expiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thegamershop-premios.com";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await sendEmailVerification({
      firstName: user.firstName,
      email: user.email,
      verifyUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[resend-verification]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
