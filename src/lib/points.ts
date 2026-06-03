import prisma from "./db";

export const DEFAULT_POINT_RULES = {
  GROUP_SIGN:       { label: "Acertar resultado (ganador/perdedor)",       points: 500 },
  GROUP_DRAW_BONUS: { label: "Bonus por acertar empate exacto",            points: 300 },
  EXACT_SCORE:      { label: "Bonus por marcador exacto (Modo Hardcore)",  points: 500 },
  GROUP_CLASSIFIED:       { label: "Acertar equipo clasificado 1° o 2°",       points: 1200 },
  GROUP_POSITION:         { label: "Acertar posición exacta en grupo (1° o 2°)", points: 1800 },
  GROUP_THIRD_QUALIFIED:  { label: "Acertar 3° que avanza como mejor tercero",   points: 800 },
  ROUND_OF_32:      { label: "Acertar equipo que pasa en Ronda de 32",     points: 2000 },
  ROUND_OF_16:      { label: "Acertar equipo que pasa en Octavos",         points: 3500 },
  QUARTER_FINALS:   { label: "Acertar equipo que pasa en Cuartos",         points: 6000 },
  SEMI_FINALS:      { label: "Acertar equipo que pasa en Semifinal",       points: 10000 },
  CHAMPION:         { label: "Acertar campeón",                            points: 30000 },
  RUNNER_UP:        { label: "Acertar finalista (subcampeón)",             points: 15000 },
  FINAL_EXACT:      { label: "Acertar campeón + subcampeón (bonus extra)", points: 40000 },
  SPECIAL_CHAMPION:    { label: "Campeón predicho antes del torneo",       points: 60 },
  SPECIAL_TOP_SCORER:  { label: "Goleador del torneo",                     points: 40 },
  SPECIAL_REVELATION:  { label: "Selección revelación",                    points: 20 },
  SPECIAL_BEST_PLAYER: { label: "Mejor jugador",                           points: 30 },
};

export const DEFAULT_ACHIEVEMENTS = {
  // Logro 1: acertar 1° y 2° exacto en al menos 4 grupos
  L1_EAGLE_EYE:    { name: "Ojo de águila",   description: "Acertar el 1° y 2° exacto en al menos 4 grupos",        points: 15000 },
  // Logro 2: acertar al menos 6 de los 8 clasificados a cuartos de final
  L2_BRACKET_PRO:  { name: "Bracket de lujo", description: "Acertar al menos 6 de los 8 clasificados a cuartos de final", points: 20000 },
  // Logro 3: acertar el campeón (predicción especial antes del torneo)
  L3_CHAMPION:     { name: "Lo vi venir",     description: "Acertar el campeón del torneo en la predicción especial", points: 50000 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateGroupQualifiers(
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

  // L1: Ojo de águila — 1° y 2° exacto en al menos 4 grupos
  if (groupsPositionPerfect >= 4) earned.push("L1_EAGLE_EYE");

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
  const dbRules = await prisma.pointRule.findMany({ where: { active: true } });
  const rm: Record<string, number> = {};
  for (const r of dbRules) rm[r.key] = r.points;
  const pts = (key: keyof typeof DEFAULT_POINT_RULES) =>
    rm[key] ?? DEFAULT_POINT_RULES[key].points;

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
    if (m.status !== "finished" || !m.realOutcome || m.phase !== "GROUP_STAGE") {
      if (p.pointsEarned !== 0) await prisma.prediction.update({ where: { id: p.id }, data: { pointsEarned: 0 } });
      continue;
    }

    let earned = 0;
    if (p.predictedOutcome && p.predictedOutcome === m.realOutcome) {
      earned += pts("GROUP_SIGN");
      if (m.realOutcome === "draw") earned += pts("GROUP_DRAW_BONUS");

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
  const groupPredictions = await prisma.groupPrediction.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          teams: { select: { id: true } },
          matches: {
            select: { phase: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
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

    const { first, second, third } = calculateGroupQualifiers(gp.group.teams, gp.group.matches);
    let earned = 0;
    let positionPerfect = true;

    if (gp.firstTeamId) {
      if (gp.firstTeamId === first || gp.firstTeamId === second) {
        earned += pts("GROUP_CLASSIFIED");
        if (gp.firstTeamId === first) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
    }

    if (gp.secondTeamId) {
      if (gp.secondTeamId === first || gp.secondTeamId === second) {
        earned += pts("GROUP_CLASSIFIED");
        if (gp.secondTeamId === second) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
    }

    if (gp.thirdTeamId && third && gp.thirdTeamId === third) {
      earned += pts("GROUP_THIRD_QUALIFIED");
    }

    if (positionPerfect && gp.firstTeamId && gp.secondTeamId) {
      achievementStats.groupsPositionPerfect++;
    }

    predictionPoints += earned;
    if (gp.pointsEarned !== earned) {
      await prisma.groupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: earned } });
    }
  }

  // ── 3. Bracket predictions ───────────────────────────────────────────────
  const bracketPredictions = await prisma.bracketPrediction.findMany({ where: { userId } });

  // Pre-fetch all finished matches indexed by matchCode to avoid N+1
  const finishedMatches = await prisma.match.findMany({
    where: { status: "finished" },
    select: { matchCode: true, winnerTeamId: true, homeTeamId: true, awayTeamId: true },
  });
  const matchByCode = new Map(finishedMatches.map((m) => [m.matchCode, m]));

  const phaseRuleMap: Record<string, keyof typeof DEFAULT_POINT_RULES> = {
    ROUND_OF_32:    "ROUND_OF_32",
    ROUND_OF_16:    "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINALS",
    SEMI_FINALS:    "SEMI_FINALS",
  };

  let finalChampionCorrect = false;
  let finalRunnerUpCorrect = false;

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

    if (bp.phase === "CHAMPION" && match.winnerTeamId) {
      if (bp.predictedTeamId === match.winnerTeamId) {
        earned = pts("CHAMPION");
        finalChampionCorrect = true;
        achievementStats.specialChampionCorrect = true;
      } else if (
        bp.predictedTeamId === match.homeTeamId ||
        bp.predictedTeamId === match.awayTeamId
      ) {
        earned = pts("RUNNER_UP");
        finalRunnerUpCorrect = true;
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

  // FINAL_EXACT bonus: both champion and runner-up correct
  if (finalChampionCorrect && finalRunnerUpCorrect) {
    predictionPoints += pts("FINAL_EXACT");
  }

  // ── 4. Bonus points (bonus actions + purchase codes + referrals) ─────────
  const [bonusAgg, codeAgg, userRec, redemptionAgg] = await Promise.all([
    prisma.userBonus.aggregate({ where: { userId, status: "approved" }, _sum: { pointsEarned: true } }),
    prisma.purchaseCode.aggregate({ where: { userId, status: "redeemed" }, _sum: { points: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { referralPoints: true, hardcoreMode: true } }),
    prisma.prizeRedemption.aggregate({ where: { userId, status: { not: "rejected" } }, _sum: { pointsSpent: true } }),
  ]);
  const bonusPoints = (bonusAgg._sum.pointsEarned ?? 0) + (codeAgg._sum.points ?? 0) + (userRec?.referralPoints ?? 0);
  const spentPoints = redemptionAgg._sum.pointsSpent ?? 0;

  // ── 5. Achievements — solo aplican en modo Hardcore ──────────────────────
  const achievementPoints = userRec?.hardcoreMode
    ? await applyAchievements(userId, achievementStats)
    : 0;

  // Si no está en hardcore, borrar logros que haya ganado antes
  if (!userRec?.hardcoreMode) {
    await prisma.userAchievement.deleteMany({ where: { userId } });
  }

  // ── 6. Update user ───────────────────────────────────────────────────────
  const totalPoints = predictionPoints + bonusPoints + achievementPoints;

  await prisma.user.update({
    where: { id: userId },
    data: { predictionPoints, bonusPoints, achievementPoints, totalPoints, spentPoints },
  });

  return totalPoints;
}
