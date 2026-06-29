import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { earlierBracketPhase, getTournamentPhaseState } from "@/lib/tournament-phase";

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        instagram: true,
        hardcoreMode: true,
        bracketMode: true,
        officialFromPhase: true,
        bracketModeChosenAt: true,
        totalPoints: true,
        predictionPoints: true,
        bonusPoints: true,
        achievementPoints: true,
        spentPoints: true,
        isBlocked: true,
        earlyBirdGranted: true,
        createdAt: true,
        passwordHash: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...profile } = user;

    // Modo OFICIAL: el modo corre desde la fase más temprana entre la guardada y
    // la primera fase del torneo todavía no terminada. Esto autocorrige cuentas
    // que quedaron con un officialFromPhase posterior al que corresponde.
    if (user.bracketMode === "OFFICIAL") {
      const { firstUnfinishedBracketPhase } = await getTournamentPhaseState();
      profile.officialFromPhase = earlierBracketPhase(
        user.officialFromPhase,
        firstUnfinishedBracketPhase
      );
    }

    // Check if user is eligible for early bird (registered before any raffle's cutoff) but hasn't claimed yet
    let earlyBirdEligible = false;
    if (!user.earlyBirdGranted) {
      const earlyBirdRaffle = await prisma.weeklyRaffle.findFirst({
        where: {
          bonusActionId: { not: null },
          status: { in: ["upcoming", "live"] },
          earlyBirdCutoff: { gte: user.createdAt },
        },
        orderBy: { earlyBirdCutoff: "asc" },
      });
      earlyBirdEligible = !!earlyBirdRaffle;
    }

    return NextResponse.json({ user: { ...profile, hasPassword: !!passwordHash, earlyBirdEligible } });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
