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
          select: { id: true, firstName: true, lastName: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.prediction.aggregate({
      where: { userId, status: "locked" },
      _sum: { pointsEarned: true },
    }),
    prisma.groupPrediction.aggregate({
      where: { userId },
      _sum: { pointsEarned: true },
    }),
    prisma.bracketPrediction.aggregate({
      where: { userId },
      _sum: { pointsEarned: true },
    }),
    prisma.specialPrediction.aggregate({
      where: { userId },
      _sum: { pointsEarned: true },
    }),
    prisma.userBonus.findMany({
      where: { userId },
      include: { bonusAction: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseCode.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
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

  const predictionMatches = matchPts._sum.pointsEarned ?? 0;
  const predictionGroups = groupPts._sum.pointsEarned ?? 0;
  const predictionBracket = bracketPts._sum.pointsEarned ?? 0;
  const predictionSpecial = specialPts._sum.pointsEarned ?? 0;

  const ptsPerReferral = parseInt(referralSetting?.value || "200", 10) || 200;

  const ledger: PointsLedgerEntry[] = [];

  if (predictionMatches > 0) {
    ledger.push({
      id: "summary-matches",
      category: "prediction_matches",
      label: "Partidos de grupos",
      detail: "Resultados acertados en fase de grupos",
      points: predictionMatches,
      date: new Date(0).toISOString(),
    });
  }
  if (predictionGroups > 0) {
    ledger.push({
      id: "summary-groups",
      category: "prediction_groups",
      label: "Posiciones de grupos",
      detail: "Clasificados y mejores terceros acertados",
      points: predictionGroups,
      date: new Date(0).toISOString(),
    });
  }
  if (predictionBracket > 0) {
    ledger.push({
      id: "summary-bracket",
      category: "prediction_bracket",
      label: "Eliminatorias y final",
      detail: "Equipos que avanzaron y campeón/subcampeón",
      points: predictionBracket,
      date: new Date(0).toISOString(),
    });
  }
  if (predictionSpecial > 0) {
    ledger.push({
      id: "summary-special",
      category: "prediction_special",
      label: "Predicciones especiales",
      points: predictionSpecial,
      date: new Date(0).toISOString(),
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

  let referralGivenTotal = 0;
  for (const ref of user.referrals) {
    referralGivenTotal += ptsPerReferral;
    ledger.push({
      id: `referral-given-${ref.id}`,
      category: "referral_given",
      label: "Invitó a un amigo",
      detail: `${ref.firstName} ${ref.lastName}`,
      points: ptsPerReferral,
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
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
