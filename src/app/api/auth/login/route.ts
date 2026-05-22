import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { signUserToken } from "@/lib/auth";
import { USER_COOKIE, COOKIE_OPTIONS } from "@/lib/cookies";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "Account blocked" }, { status: 403 });
    }

    if (user.passwordHash) {
      // User already has a password — require it and verify
      if (!password) {
        return NextResponse.json({ error: "Se requiere contraseña" }, { status: 401 });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
      }
    } else {
      // No password set yet — migration path for existing users
      if (!password) {
        return NextResponse.json(
          {
            error:
              "Necesitás crear una contraseña. Ingresá una nueva contraseña para configurarla.",
          },
          { status: 401 }
        );
      }
      // Set the password for the first time
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });
    }

    const token = signUserToken(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalPoints: user.totalPoints,
        predictionPoints: user.predictionPoints,
        bonusPoints: user.bonusPoints,
      },
    });

    response.cookies.set(USER_COOKIE, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
