import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        referralCode: true,
        referralPoints: true,
        _count: { select: { referrals: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auto-generate referral code for existing users that don't have one
    if (!user.referralCode) {
      let code = generateReferralCode();
      while (await prisma.user.findUnique({ where: { referralCode: code } })) {
        code = generateReferralCode();
      }
      user = await prisma.user.update({
        where: { id: auth.userId },
        data: { referralCode: code },
        select: {
          referralCode: true,
          referralPoints: true,
          _count: { select: { referrals: true } },
        },
      });
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      referralPoints: user.referralPoints,
      referralCount: user._count.referrals,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
