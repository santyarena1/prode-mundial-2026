import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, firstName: true, email: true },
    });

    // Siempre responder OK para no revelar si el email existe
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      firstName: user.firstName,
      email: user.email,
      resetUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
