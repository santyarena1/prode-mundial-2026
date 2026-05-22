import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { signUserToken } from "@/lib/auth";
import { USER_COOKIE, COOKIE_OPTIONS } from "@/lib/cookies";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  instagram: z.string().optional(),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: "Must accept terms",
  }),
});

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

    const { firstName, lastName, instagram, acceptedTerms, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone.trim();

    // Check uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        passwordHash,
        instagram: instagram || null,
        acceptedTerms,
      },
    });

    // Send welcome email — fire and forget (don't block registration if it fails)
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
