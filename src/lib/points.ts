import prisma from "./db";
import { BRACKET_PHASE_ORDER } from "./tournament-phase";

export const DEFAULT_POINT_RULES = {
  GROUP_SIGN:       { label: "Acertar resultado (ganador/perdedor)",       points: 500 },
  GROUP_DRAW_BONUS: { label: "Bonus por acertar empate exacto",            points: 300 },
  EXACT_SCORE:      { label: "Bonus por marcador exacto (Modo Hardcore)",  points: 500 },
  GROUP_CLASSIFIED:       { label: "Acertar equipo clasificado 1° o 2°",       points: 1500 },
  GROUP_POSITION:         { label: "Acertar posición exacta en grupo (1° o 2°)", points: 500 },
  GROUP_THIRD_QUALIFIED:  { label: "Acertar 3° que avanza como mejor tercero",   points: 800 },
  ROUND_OF_32:      { label: "Acertar ganador en Ronda de 32",            points: 1500 },
  ROUND_OF_16:      { label: "Acertar ganador en Octavos",                points: 2000 },
  QUARTER_FINALS:   { label: "Acertar ganador en Cuartos",                points: 4000 },
  SEMI_FINALS:      { label: "Acertar ganador en Semifinal",              points: 6000 },
  CHAMPION:         { label: "Acertar campeón",                           points: 10000 },
  // Modo Resultados Oficiales (plano en todas las fases eliminatorias).
  OFFICIAL_WINNER:  { label: "Acertar ganador (Resultados Oficiales)",    points: 1500 },
  OFFICIAL_EXACT:   { label: "Acertar resultado exacto (Resultados Oficiales)", points: 2000 },
  SPECIAL_CHAMPION:    { label: "Campeón predicho antes del torneo",       points: 60 },
  SPECIAL_TOP_SCORER:  { label: "Goleador del torneo",                     points: 40 },
  SPECIAL_REVELATION:  { label: "Selección revelación",                    points: 20 },
  SPECIAL_BEST_PLAYER: { label: "Mejor jugador",                           points: 30 },
};

export const DEFAULT_ACHIEVEMENTS = {
  // Logro 1: acertar 1° y 2° exacto en los 12 grupos
  L1_EAGLE_EYE:    { name: "Ojo de águila",   description: "Acertar el 1° y 2° exacto en los 12 grupos",            points: 15000 },
  // Logro 2: acertar al menos 6 de los 8 clasificados a cuartos de final
  L2_BRACKET_PRO:  { name: "Bracket de lujo", description: "Acertar al menos 6 de los 8 clasificados a cuartos de final", points: 20000 },
  // Logro 3: acertar el campeón (predicción especial antes del torneo)
  L3_CHAMPION:     { name: "Lo vi venir",     description: "Acertar el campeón del torneo en la predicción especial", points: 50000 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function calculateGroupQualifiers(
  teams: Array<{ id: string }>,
  matches: Array<{
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    phase: string;
  }>
): { first: string | null; second: string | null; third: string | null } {
  const stats: Record<string, { pts: number; gd: number; gf: number }> = {};
  for (const t of teams) stats[t.id] = { pts: 0, gd: 0, gf: 0 };

  for (const m of matches) {
    if (m.phase !== "GROUP_STAGE" || m.status !== "finished") continue;
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore == null || m.awayScore == null) continue;
    if (!stats[m.homeTeamId]) stats[m.homeTeamId] = { pts: 0, gd: 0, gf: 0 };
    if (!stats[m.awayTeamId]) stats[m.awayTeamId] = { pts: 0, gd: 0, gf: 0 };
    const h = m.homeScore, a = m.awayScore;
    if (h > a) stats[m.homeTeamId].pts += 3;
    else if (a > h) stats[m.awayTeamId].pts += 3;
    else { stats[m.homeTeamId].pts += 1; stats[m.awayTeamId].pts += 1; }
    stats[m.homeTeamId].gd += h - a;
    stats[m.awayTeamId].gd += a - h;
    stats[m.homeTeamId].gf += h;
    stats[m.awayTeamId].gf += a;
  }

  const sorted = Object.entries(stats)
    .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return { first: sorted[0]?.[0] ?? null, second: sorted[1]?.[0] ?? null, third: sorted[2]?.[0] ?? null };
}

// ── Achievement calculation (idempotent) ─────────────────────────────────────

interface AchievementStats {
  groupsPositionPerfect: number;  // grupos con 1° y 2° exacto
  bracketQfCorrect: number;       // equipos acertados que llegaron a cuartos
  specialChampionCorrect: boolean; // acertó el campeón en predicción especial
}

async function applyAchievements(userId: string, stats: AchievementStats): Promise<number> {
  const rules = await prisma.achievementRule.findMany({ where: { active: true } });
  if (rules.length === 0) return 0;

  const ruleMap: Record<string, { id: string; points: number }> = {};
  for (const r of rules) ruleMap[r.key] = { id: r.id, points: r.points };

  const earned: string[] = [];
  const { groupsPositionPerfect, bracketQfCorrect, specialChampionCorrect } = stats;

  // L1: Ojo de águila — 1° y 2° exacto en los 12 grupos
  if (groupsPositionPerfect >= 12) earned.push("L1_EAGLE_EYE");

  // L2: Bracket de lujo — al menos 6 de los 8 clasificados a cuartos
  if (bracketQfCorrect >= 6) earned.push("L2_BRACKET_PRO");

  // L3: Lo vi venir — acertar el campeón en la predicción especial
  if (specialChampionCorrect) earned.push("L3_CHAMPION");

  // Remove achievements no longer earned
  await prisma.userAchievement.deleteMany({
    where: { userId, achievementRule: { key: { notIn: earned } } },
  });

  let total = 0;
  for (const key of earned) {
    const rule = ruleMap[key];
    if (!rule) continue;
    await prisma.userAchievement.upsert({
      where: { userId_achievementRuleId: { userId, achievementRuleId: rule.id } },
      update: { pointsEarned: rule.points },
      create: { userId, achievementRuleId: rule.id, pointsEarned: rule.points },
    });
    total += rule.points;
  }
  return total;
}

// ── Main calculation ──────────────────────────────────────────────────────────

export async function calculateUserPoints(userId: string): Promise<number> {
  const pts = (key: keyof typeof DEFAULT_POINT_RULES) => DEFAULT_POINT_RULES[key].points;

  let predictionPoints = 0;
  const achievementStats: AchievementStats = {
    groupsPositionPerfect: 0,
    bracketQfCorrect: 0,
    specialChampionCorrect: false,
  };

  // ── 1. Group stage match predictions ────────────────────────────────────
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
  });

  for (const p of predictions) {
    const m = p.match;
    if (m.status !== "finished" || m.phase !== "GROUP_STAGE") {
      if (p.pointsEarned !== 0) await prisma.prediction.update({ where: { id: p.id }, data: { pointsEarned: 0 } });
      continue;
    }

    // Derive real outcome from scores when stored realOutcome is missing/stale
    const effectiveReal =
      m.homeScore !== null && m.awayScore !== null
        ? m.homeScore > m.awayScore ? "home"
          : m.awayScore > m.homeScore ? "away"
          : "draw"
        : m.realOutcome;

    if (!effectiveReal) {
      if (p.pointsEarned !== 0) await prisma.prediction.update({ where: { id: p.id }, data: { pointsEarned: 0 } });
      continue;
    }

    // When scores are stored, derive effective outcome from them (handles stale predictedOutcome)
    const effectiveOutcome =
      p.predictedHomeScore !== null && p.predictedAwayScore !== null
        ? p.predictedHomeScore > p.predictedAwayScore ? "home"
          : p.predictedAwayScore > p.predictedHomeScore ? "away"
          : "draw"
        : p.predictedOutcome;

    let earned = 0;
    if (effectiveOutcome && effectiveOutcome === effectiveReal) {
      earned += pts("GROUP_SIGN");
      if (effectiveReal === "draw") earned += pts("GROUP_DRAW_BONUS");

      // Hardcore bonus: exact scoreline
      if (
        p.predictedHomeScore !== null && p.predictedAwayScore !== null &&
        m.homeScore !== null && m.awayScore !== null &&
        p.predictedHomeScore === m.homeScore && p.predictedAwayScore === m.awayScore
      ) {
        earned += pts("EXACT_SCORE");
      }
    }

    predictionPoints += earned;
    if (p.pointsEarned !== earned) {
      await prisma.prediction.update({ where: { id: p.id }, data: { pointsEarned: earned } });
    }
  }

  // ── 2. Group classification predictions ─────────────────────────────────
  // Build a lookup of the user's locked predictions by matchId
  const predByMatchId = new Map(predictions.map(p => [p.matchId, p]));

  const groupPredictions = await prisma.groupPrediction.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          teams: { select: { id: true } },
          matches: {
            select: { id: true, phase: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
          },
        },
      },
    },
  });

  for (const gp of groupPredictions) {
    const groupMatches = gp.group.matches.filter(m => m.phase === "GROUP_STAGE");
    const finished = groupMatches.filter(m => m.status === "finished");

    if (finished.length < groupMatches.length || groupMatches.length === 0) {
      if (gp.pointsEarned !== 0) await prisma.groupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: 0 } });
      continue;
    }

    // Compute predicted standings from the user's match predictions (same logic as the UI)
    // so that what gives points always matches what's shown in the standings table.
    const predStats: Record<string, { pts: number; gd: number; gf: number }> = {};
    for (const t of gp.group.teams) predStats[t.id] = { pts: 0, gd: 0, gf: 0 };

    let allPredicted = true;
    for (const m of groupMatches) {
      if (!m.homeTeamId || !m.awayTeamId) continue;
      const pred = predByMatchId.get(m.id);
      if (!pred?.predictedOutcome) { allPredicted = false; break; }

      if (pred.predictedOutcome === "home") predStats[m.homeTeamId].pts += 3;
      else if (pred.predictedOutcome === "away") predStats[m.awayTeamId].pts += 3;
      else { predStats[m.homeTeamId].pts += 1; predStats[m.awayTeamId].pts += 1; }

      if (pred.predictedHomeScore != null && pred.predictedAwayScore != null) {
        predStats[m.homeTeamId].gd += pred.predictedHomeScore - pred.predictedAwayScore;
        predStats[m.awayTeamId].gd += pred.predictedAwayScore - pred.predictedHomeScore;
        predStats[m.homeTeamId].gf += pred.predictedHomeScore;
        predStats[m.awayTeamId].gf += pred.predictedAwayScore;
      }
    }

    if (!allPredicted) {
      if (gp.pointsEarned !== 0) await prisma.groupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: 0 } });
      continue;
    }

    const predSorted = Object.entries(predStats)
      .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    const predFirst  = predSorted[0]?.[0] ?? null;
    const predSecond = predSorted[1]?.[0] ?? null;

    const { first, second } = calculateGroupQualifiers(gp.group.teams, gp.group.matches);
    let earned = 0;
    let positionPerfect = true;

    if (predFirst) {
      if (predFirst === first || predFirst === second) {
        earned += pts("GROUP_CLASSIFIED");
        if (predFirst === first) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
    } else positionPerfect = false;

    if (predSecond) {
      if (predSecond === first || predSecond === second) {
        earned += pts("GROUP_CLASSIFIED");
        if (predSecond === second) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
    } else positionPerfect = false;

    // 3° no da puntos de clasificación
    if (positionPerfect && predFirst && predSecond) {
      achievementStats.groupsPositionPerfect++;
    }

    predictionPoints += earned;
    if (gp.pointsEarned !== earned) {
      await prisma.groupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: earned } });
    }
  }

  // ── 3. Bracket predictions ───────────────────────────────────────────────
  const bracketPredictions = await prisma.bracketPrediction.findMany({ where: { userId } });

  // Modo de llaves del usuario: en OFICIAL las fases >= officialFromPhase se
  // puntúan plano (1500 ganador / 2000 exacto); las anteriores siguen clásicas.
  const bracketModeUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { bracketMode: true, officialFromPhase: true },
  });
  const officialFromIdx =
    bracketModeUser?.bracketMode === "OFFICIAL" && bracketModeUser.officialFromPhase
      ? BRACKET_PHASE_ORDER.indexOf(
          bracketModeUser.officialFromPhase as (typeof BRACKET_PHASE_ORDER)[number]
        )
      : -1;

  // Pre-fetch all finished matches indexed by matchCode to avoid N+1
  const finishedMatches = await prisma.match.findMany({
    where: { status: "finished" },
    select: {
      matchCode: true,
      winnerTeamId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
    },
  });
  const matchByCode = new Map(finishedMatches.map((m) => [m.matchCode, m]));

  const phaseRuleMap: Record<string, keyof typeof DEFAULT_POINT_RULES> = {
    ROUND_OF_32:    "ROUND_OF_32",
    ROUND_OF_16:    "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINALS",
    SEMI_FINALS:    "SEMI_FINALS",
  };

  for (const bp of bracketPredictions) {
    if (!bp.predictedTeamId) {
      if (bp.pointsEarned !== 0) await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: 0 } });
      continue;
    }

    // CHAMPION phase uses matchSlot "1" — map to the actual final match (103)
    const lookupSlot = bp.phase === "CHAMPION" ? "103" : bp.matchSlot;
    const match = matchByCode.get(lookupSlot) ?? null;

    if (!match) {
      if (bp.pointsEarned !== 0) await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: 0 } });
      continue;
    }

    let earned = 0;

    // Modo Resultados Oficiales: puntaje plano para las fases desde officialFromPhase.
    const phaseIdx = BRACKET_PHASE_ORDER.indexOf(bp.phase as (typeof BRACKET_PHASE_ORDER)[number]);
    const isOfficialPhase = officialFromIdx >= 0 && phaseIdx >= officialFromIdx;

    if (isOfficialPhase) {
      if (match.winnerTeamId) {
        const exactScore =
          bp.predictedHomeScore != null &&
          bp.predictedAwayScore != null &&
          match.homeScore != null &&
          match.awayScore != null &&
          bp.predictedHomeScore === match.homeScore &&
          bp.predictedAwayScore === match.awayScore;
        if (exactScore) {
          earned = pts("OFFICIAL_EXACT");
        } else if (bp.predictedTeamId === match.winnerTeamId) {
          earned = pts("OFFICIAL_WINNER");
        }
        // Logro de cuartos: en oficial los cruces son reales, igual cuenta el acierto.
        if (earned > 0 && bp.phase === "QUARTER_FINALS") achievementStats.bracketQfCorrect++;
      }
    } else if (bp.phase === "CHAMPION" && match.winnerTeamId) {
      if (bp.predictedTeamId === match.winnerTeamId) {
        earned = pts("CHAMPION");
      }
    } else {
      const ruleKey = phaseRuleMap[bp.phase];
      if (ruleKey && match.winnerTeamId && bp.predictedTeamId === match.winnerTeamId) {
        earned = pts(ruleKey);
        if (bp.phase === "QUARTER_FINALS") achievementStats.bracketQfCorrect++;
      }
    }

    predictionPoints += earned;
    if (bp.pointsEarned !== earned) {
      await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: earned } });
    }
  }

  // ── 4. Bonus points (bonus actions + purchase codes + referrals) ─────────
  const [bonusAgg, codeAgg, multiCodeAgg, userRec, redemptionAgg] = await Promise.all([
    prisma.userBonus.aggregate({ where: { userId, status: "approved" }, _sum: { pointsEarned: true } }),
    prisma.purchaseCode.aggregate({ where: { userId, status: "redeemed", maxUses: null }, _sum: { points: true } }),
    prisma.purchaseCodeRedemption.aggregate({ where: { userId }, _sum: { pointsEarned: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { referralPoints: true, hardcoreMode: true, emailVerified: true } }),
    prisma.prizeRedemption.aggregate({ where: { userId, status: { not: "rejected" } }, _sum: { pointsSpent: true } }),
  ]);
  const bonusPoints = (bonusAgg._sum.pointsEarned ?? 0) + (codeAgg._sum.points ?? 0) + (multiCodeAgg._sum.pointsEarned ?? 0) + (userRec?.referralPoints ?? 0);
  const spentPoints = redemptionAgg._sum.pointsSpent ?? 0;

  // ── 5. Achievements — solo aplican en modo Hardcore ──────────────────────
  const achievementPoints = userRec?.hardcoreMode
    ? await applyAchievements(userId, achievementStats)
    : 0;

  // Si no está en hardcore, borrar logros que haya ganado antes
  if (!userRec?.hardcoreMode) {
    await prisma.userAchievement.deleteMany({ where: { userId } });
  }

  // ── 6. Email verification gate ──────────────────────────────────────────
  // Users registered via referral code must verify their email before any
  // points (predictions, bonuses, achievements) are credited. Once verified,
  // the recalculation runs again and credits everything retroactively.
  const isVerified = userRec?.emailVerified !== false;
  const finalPredictionPoints = isVerified ? predictionPoints : 0;
  const finalBonusPoints = isVerified ? bonusPoints : 0;
  const finalAchievementPoints = isVerified ? achievementPoints : 0;

  // ── 7. Update user ───────────────────────────────────────────────────────
  const totalPoints = finalPredictionPoints + finalBonusPoints + finalAchievementPoints;

  await prisma.user.update({
    where: { id: userId },
    data: {
      predictionPoints: finalPredictionPoints,
      bonusPoints: finalBonusPoints,
      achievementPoints: finalAchievementPoints,
      totalPoints,
      spentPoints,
    },
  });

  return totalPoints;
}
