import prisma from "./db";
import { codeTypeLabel } from "./purchase-code";

export type PointsLedgerCategory =
  | "prediction_matches"
  | "prediction_groups"
  | "prediction_bracket"
  | "prediction_special"
  | "bonus_action"
  | "purchase_code"
  | "referral_received"
  | "referral_given"
  | "achievement"
  | "manual_admin"
  | "redemption";

export type PointsLedgerEntry = {
  id: string;
  category: PointsLedgerCategory;
  label: string;
  detail?: string;
  points: number;
  status?: string;
  date: string;
};

export type PointsBreakdownSummary = {
  predictionPoints: number;
  predictionMatches: number;
  predictionGroups: number;
  predictionBracket: number;
  predictionSpecial: number;
  bonusActionPoints: number;
  manualAdminPoints: number;
  purchaseCodePoints: number;
  referralPoints: number;
  referralReceivedPoints: number;
  achievementPoints: number;
  bonusPoints: number;
  spentPoints: number;
  totalPoints: number;
  availablePoints: number;
};

export const CATEGORY_LABELS: Record<PointsLedgerCategory, string> = {
  prediction_matches: "Partidos",
  prediction_groups: "Grupos",
  prediction_bracket: "Eliminatorias",
  prediction_special: "Especiales",
  bonus_action: "Bonus / acción",
  purchase_code: "Código",
  referral_received: "Código de amigo",
  referral_given: "Invitó amigos",
  achievement: "Logro",
  manual_admin: "Ajuste admin",
  redemption: "Canje de premio",
};

export const CATEGORY_COLORS: Record<PointsLedgerCategory, string> = {
  prediction_matches: "text-blue-400",
  prediction_groups: "text-purple-400",
  prediction_bracket: "text-orange-400",
  prediction_special: "text-cyan-400",
  bonus_action: "text-green-400",
  purchase_code: "text-pink-400",
  referral_received: "text-emerald-400",
  referral_given: "text-teal-400",
  achievement: "text-yellow-400",
  manual_admin: "text-amber-400",
  redemption: "text-red-400",
};

const MANUAL_ADMIN_ACTION = "Puntos extra (admin)";
const REFERRAL_RECEIVED_ACTION = "Código de referido";

function classifyBonusAction(name: string): PointsLedgerCategory {
  if (name === MANUAL_ADMIN_ACTION) return "manual_admin";
  if (name === REFERRAL_RECEIVED_ACTION) return "referral_received";
  return "bonus_action";
}

export async function getUserPointsBreakdown(userId: string): Promise<{
  summary: PointsBreakdownSummary;
  ledger: PointsLedgerEntry[];
  referredBy: {
    id: string;
    firstName: string;
    lastName: string;
    referralCode: string | null;
  } | null;
  referrals: Array<{
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
}> {
  const [
    user,
    matchPts,
    groupPts,
    bracketPts,
    specialPts,
    bonuses,
    purchaseCodes,
    multiUseRedemptions,
    redemptions,
    achievements,
    referralSetting,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        predictionPoints: true,
        bonusPoints: true,
        achievementPoints: true,
        referralPoints: true,
        totalPoints: true,
        spentPoints: true,
        hardcoreMode: true,
        referredBy: {
          select: { id: true, firstName: true, lastName: true, referralCode: true },
        },
        referrals: {
          select: { id: true, firstName: true, lastName: true, createdAt: true, emailVerified: true, referralBonusAwarded: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.prediction.findMany({
      where: { userId, status: "locked" },
      include: {
        match: {
          select: {
            phase: true,
            startDate: true,
            homeScore: true,
            awayScore: true,
            realOutcome: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.groupPrediction.findMany({
      where: { userId },
      include: {
        group: { select: { name: true } },
        firstTeam: { select: { name: true } },
        secondTeam: { select: { name: true } },
        thirdTeam: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.bracketPrediction.findMany({
      where: { userId },
      include: { predictedTeam: { select: { name: true } } },
      orderBy: [{ phase: "asc" }, { matchSlot: "asc" }],
    }),
    prisma.specialPrediction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userBonus.findMany({
      where: { userId },
      include: { bonusAction: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseCode.findMany({
      where: { userId, maxUses: null },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.purchaseCodeRedemption.findMany({
      where: { userId },
      include: { purchaseCode: { select: { code: true, type: true } } },
      orderBy: { redeemedAt: "desc" },
    }),
    prisma.prizeRedemption.findMany({
      where: { userId },
      include: { prize: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievementRule: true },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.setting.findUnique({ where: { key: "referral_points" } }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // Derive totals from individual records
  let predictionMatches = 0;
  let predictionGroups = 0;
  let predictionBracket = 0;
  let predictionSpecial = 0;

  const ptsPerReferral = parseInt(referralSetting?.value || "200", 10) || 200;

  const ledger: PointsLedgerEntry[] = [];

  // ── Individual match predictions ────────────────────────────────────────
  const PHASE_LABEL_MAP: Record<string, string> = {
    ROUND_OF_32: "Ronda de 32",
    ROUND_OF_16: "Octavos",
    QUARTER_FINALS: "Cuartos",
    SEMI_FINALS: "Semifinal",
    FINAL: "Final",
  };

  for (const p of matchPts) {
    const m = p.match;
    const homeName = m.homeTeam?.name ?? "?";
    const awayName = m.awayTeam?.name ?? "?";
    const phase = m.phase;
    const category: PointsLedgerCategory = phase === "GROUP_STAGE" ? "prediction_matches" : "prediction_bracket";
    const phaseLabel = phase === "GROUP_STAGE"
      ? (m.group ? `Grupo ${m.group.name}` : "Fase de grupos")
      : (PHASE_LABEL_MAP[phase] ?? phase);

    let outcomeDetail = "";
    if (p.predictedOutcome === "home") outcomeDetail = `Ganó ${homeName}`;
    else if (p.predictedOutcome === "away") outcomeDetail = `Ganó ${awayName}`;
    else if (p.predictedOutcome === "draw") outcomeDetail = "Empate";

    if (p.predictedHomeScore != null && p.predictedAwayScore != null) {
      outcomeDetail += ` · ${p.predictedHomeScore}-${p.predictedAwayScore}`;
    }

    const earned = p.pointsEarned;
    if (phase === "GROUP_STAGE") predictionMatches += earned;
    else predictionBracket += earned;

    if (earned === 0) continue;

    ledger.push({
      id: `match-${p.id}`,
      category,
      label: `${homeName} vs ${awayName}`,
      detail: outcomeDetail || undefined,
      points: earned,
      status: earned > 0 ? "correct" : m.homeScore != null ? "wrong" : undefined,
      date: p.updatedAt.toISOString(),
    });
  }

  // ── Individual group standing predictions ────────────────────────────────
  for (const gp of groupPts) {
    predictionGroups += gp.pointsEarned;
    if (gp.pointsEarned === 0) continue;
    const teams = [gp.firstTeam?.name, gp.secondTeam?.name].filter(Boolean).join(" · ");
    ledger.push({
      id: `group-${gp.id}`,
      category: "prediction_groups",
      label: `Grupo ${gp.group.name} — Clasificados`,
      detail: teams || undefined,
      points: gp.pointsEarned,
      date: gp.updatedAt.toISOString(),
    });
  }

  // ── Individual bracket predictions ──────────────────────────────────────
  const BRACKET_PHASE_LABEL: Record<string, string> = {
    ROUND_OF_32: "Ronda de 32",
    ROUND_OF_16: "Octavos",
    QUARTER_FINALS: "Cuartos",
    SEMI_FINALS: "Semifinal",
    CHAMPION: "Campeón",
  };
  for (const bp of bracketPts) {
    if (!bp.predictedTeamId) continue;
    predictionBracket += bp.pointsEarned;
    if (bp.pointsEarned === 0) continue;
    ledger.push({
      id: `bracket-${bp.id}`,
      category: "prediction_bracket",
      label: `${BRACKET_PHASE_LABEL[bp.phase] ?? bp.phase}: ${bp.predictedTeam?.name ?? "?"}`,
      points: bp.pointsEarned,
      date: bp.updatedAt.toISOString(),
    });
  }

  // ── Special predictions ──────────────────────────────────────────────────
  const SPECIAL_TYPE_LABEL: Record<string, string> = {
    CHAMPION: "Campeón predicho",
    TOP_SCORER: "Goleador del torneo",
    REVELATION: "Selección revelación",
    BEST_PLAYER: "Mejor jugador",
  };
  for (const sp of specialPts) {
    predictionSpecial += sp.pointsEarned;
    if (sp.pointsEarned === 0) continue;
    ledger.push({
      id: `special-${sp.id}`,
      category: "prediction_special",
      label: SPECIAL_TYPE_LABEL[sp.type] ?? sp.type,
      detail: sp.predictedValue,
      points: sp.pointsEarned,
      date: sp.createdAt.toISOString(),
    });
  }

  let bonusActionPoints = 0;
  let manualAdminPoints = 0;
  let referralReceivedPoints = 0;
  let purchaseCodePoints = 0;

  for (const b of bonuses) {
    const category = classifyBonusAction(b.bonusAction.name);
    const approvedPoints = b.status === "approved" ? b.pointsEarned : 0;

    if (category === "referral_received" && b.status === "approved") {
      referralReceivedPoints += approvedPoints;
    } else if (category === "manual_admin" && b.status === "approved") {
      manualAdminPoints += approvedPoints;
    } else if (category === "bonus_action" && b.status === "approved") {
      bonusActionPoints += approvedPoints;
    }

    ledger.push({
      id: `bonus-${b.id}`,
      category,
      label: b.bonusAction.name,
      detail: b.socialHandles || undefined,
      points: approvedPoints,
      status: b.status,
      date: b.createdAt.toISOString(),
    });
  }

  for (const code of purchaseCodes) {
    const typeLabel = codeTypeLabel(code.type);
    const approvedPoints = code.status === "redeemed" ? code.points : 0;
    if (code.status === "redeemed") purchaseCodePoints += approvedPoints;

    ledger.push({
      id: `code-${code.id}`,
      category: "purchase_code",
      label: typeLabel,
      detail: code.code,
      points: approvedPoints,
      status: code.status,
      date: (code.redeemedAt ?? code.updatedAt).toISOString(),
    });
  }

  for (const r of multiUseRedemptions) {
    purchaseCodePoints += r.pointsEarned;
    ledger.push({
      id: `multicode-${r.id}`,
      category: "purchase_code",
      label: codeTypeLabel(r.purchaseCode.type),
      detail: r.purchaseCode.code,
      points: r.pointsEarned,
      status: "redeemed",
      date: r.redeemedAt.toISOString(),
    });
  }

  // Referidos creados antes de que existiera el flujo de verificación (deploy 2026-06-19)
  // se consideran acreditados por definición — el código viejo sumaba los puntos al registrar.
  const VERIFICATION_DEPLOY = new Date("2026-06-19T20:30:00-03:00");
  const isReferralCredited = (r: { createdAt: Date; emailVerified: boolean; referralBonusAwarded: boolean }) =>
    r.createdAt < VERIFICATION_DEPLOY || (r.emailVerified && r.referralBonusAwarded);

  let referralGivenTotal = 0;
  for (const ref of user.referrals) {
    const credited = isReferralCredited(ref);
    if (credited) referralGivenTotal += ptsPerReferral;
    ledger.push({
      id: `referral-given-${ref.id}`,
      category: "referral_given",
      label: credited ? "Invitó a un amigo" : "Referido pendiente de verificación",
      detail: `${ref.firstName} ${ref.lastName}`,
      points: credited ? ptsPerReferral : 0,
      status: credited ? undefined : "pending",
      date: ref.createdAt.toISOString(),
    });
  }

  if (user.referralPoints > referralGivenTotal && user.referrals.length === 0) {
    ledger.push({
      id: "referral-given-aggregate",
      category: "referral_given",
      label: "Puntos por referidos",
      detail: "Referidos registrados con tu código",
      points: user.referralPoints,
      date: new Date(0).toISOString(),
    });
  } else if (user.referralPoints > referralGivenTotal) {
    const diff = user.referralPoints - referralGivenTotal;
    ledger.push({
      id: "referral-given-adjustment",
      category: "referral_given",
      label: "Ajuste de puntos por referidos",
      points: diff,
      date: new Date(0).toISOString(),
    });
  }

  for (const a of achievements) {
    ledger.push({
      id: `achievement-${a.id}`,
      category: "achievement",
      label: a.achievementRule.name,
      detail: a.achievementRule.description,
      points: a.pointsEarned,
      date: a.awardedAt.toISOString(),
    });
  }

  for (const r of redemptions) {
    const spent = r.status !== "rejected" ? r.pointsSpent : 0;
    ledger.push({
      id: `redemption-${r.id}`,
      category: "redemption",
      label: r.prize.name,
      points: -spent,
      status: r.status,
      date: r.createdAt.toISOString(),
    });
  }

  ledger.sort((a, b) => {
    const aSummary = a.id.startsWith("summary-");
    const bSummary = b.id.startsWith("summary-");
    if (aSummary && !bSummary) return 1;
    if (!aSummary && bSummary) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const summary: PointsBreakdownSummary = {
    predictionPoints: user.predictionPoints,
    predictionMatches,
    predictionGroups,
    predictionBracket,
    predictionSpecial,
    bonusActionPoints,
    manualAdminPoints,
    purchaseCodePoints,
    referralPoints: user.referralPoints,
    referralReceivedPoints,
    achievementPoints: user.achievementPoints,
    bonusPoints: user.bonusPoints,
    spentPoints: user.spentPoints,
    totalPoints: user.totalPoints,
    availablePoints: user.totalPoints - user.spentPoints,
  };

  return {
    summary,
    ledger,
    referredBy: user.referredBy,
    referrals: user.referrals.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
