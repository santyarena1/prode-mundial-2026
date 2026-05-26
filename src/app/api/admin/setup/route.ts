import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// One-time endpoint to create the first admin user.
// Requires ADMIN_SETUP_SECRET env var to be set.
// Only works if no admin users exist yet, OR with the correct secret.
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Setup not enabled" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, setupSecret } = body;

    if (setupSecret !== secret) {
      return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
    }
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "email and password (min 8 chars) required" }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Admin with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.adminUser.create({
      data: { email: email.trim().toLowerCase(), passwordHash },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ admin }, { status: 201 });
  } catch (error) {
    console.error("Admin setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
