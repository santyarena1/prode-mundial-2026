import prisma from "./db";

export const DEFAULT_POINT_RULES = {
  GROUP_SIGN:      { label: "Acertar resultado (ganador/perdedor)", points: 50 },
  GROUP_DRAW_BONUS:{ label: "Bonus por acertar empate exacto",       points: 30 },
  GROUP_CLASSIFIED:{ label: "Acertar equipo clasificado del grupo",   points: 120 },
  GROUP_POSITION:  { label: "Acertar posición exacta en grupo (1° o 2°)", points: 180 },
  ROUND_OF_32:     { label: "Acertar equipo que pasa en Ronda de 32", points: 200 },
  ROUND_OF_16:     { label: "Acertar equipo que pasa en Octavos",     points: 350 },
  QUARTER_FINALS:  { label: "Acertar equipo que pasa en Cuartos",     points: 600 },
  SEMI_FINALS:     { label: "Acertar equipo que pasa en Semifinal",   points: 1000 },
  CHAMPION:        { label: "Acertar campeón",                        points: 3000 },
  RUNNER_UP:       { label: "Acertar finalista (subcampeón)",         points: 1500 },
  FINAL_EXACT:     { label: "Acertar final completa (extra)",         points: 5000 },
  SPECIAL_CHAMPION:{ label: "Campeón predicho antes del torneo",      points: 60 },
  SPECIAL_TOP_SCORER:{ label: "Goleador del torneo",                  points: 40 },
  SPECIAL_REVELATION:{ label: "Selección revelación",                 points: 20 },
  SPECIAL_BEST_PLAYER:{ label: "Mejor jugador",                       points: 30 },
};

export const DEFAULT_ACHIEVEMENTS = {
  GOOD_START:       { name: "Buen arranque",          description: "Acertar 10 partidos de fase de grupos",            points: 1000 },
  GROUP_SPECIALIST: { name: "Especialista de grupos", description: "Acertar 35 partidos de fase de grupos",            points: 3000 },
  WORLD_EXPERT:     { name: "Experto mundialista",    description: "Acertar 45 partidos de fase de grupos",            points: 7500 },
  GROUP_MACHINE:    { name: "Máquina de grupos",      description: "Acertar 55 partidos de fase de grupos",            points: 15000 },
  SHARP_EYE:        { name: "Ojo clínico",            description: "Acertar 18 clasificados de grupo",                 points: 5000 },
  PERFECT_TABLE:    { name: "Tabla perfecta",         description: "Acertar todos los 1° y 2° exactos de los grupos",  points: 20000 },
  STRONG_BRACKET:   { name: "Bracket fuerte",         description: "Acertar el 70% de las predicciones de eliminatorias", points: 10000 },
  PERFECT_BRACKET:  { name: "Bracket perfecto",       description: "Acertar toda la llave eliminatoria",               points: 30000 },
  DREAM_FINAL:      { name: "Final soñada",           description: "Acertar campeón y subcampeón",                    points: 5000 },
  PERFECT_PRODE:    { name: "Prode perfecto",         description: "Acertar todo el prode completo",                  points: 150000 },
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
): { first: string | null; second: string | null } {
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

  return { first: sorted[0]?.[0] ?? null, second: sorted[1]?.[0] ?? null };
}

// ── Achievement calculation (idempotent) ─────────────────────────────────────

interface AchievementStats {
  groupCorrect: number;
  classifiedCorrect: number;
  groupsChecked: number;
  groupsPositionPerfect: number;
  bracketCorrect: number;
  bracketFinished: number;
  finalChampionCorrect: boolean;
  finalRunnerUpCorrect: boolean;
}

async function applyAchievements(userId: string, stats: AchievementStats): Promise<number> {
  const rules = await prisma.achievementRule.findMany({ where: { active: true } });
  if (rules.length === 0) return 0;

  const ruleMap: Record<string, { id: string; points: number }> = {};
  for (const r of rules) ruleMap[r.key] = { id: r.id, points: r.points };

  const earned: string[] = [];
  const { groupCorrect, classifiedCorrect, groupsChecked, groupsPositionPerfect,
          bracketCorrect, bracketFinished, finalChampionCorrect, finalRunnerUpCorrect } = stats;

  if (groupCorrect >= 10) earned.push("GOOD_START");
  if (groupCorrect >= 35) earned.push("GROUP_SPECIALIST");
  if (groupCorrect >= 45) earned.push("WORLD_EXPERT");
  if (groupCorrect >= 55) earned.push("GROUP_MACHINE");
  if (classifiedCorrect >= 18) earned.push("SHARP_EYE");
  if (groupsChecked >= 12 && groupsPositionPerfect >= 12) earned.push("PERFECT_TABLE");
  if (bracketFinished > 0 && bracketCorrect / bracketFinished >= 0.7) earned.push("STRONG_BRACKET");
  if (bracketFinished > 0 && bracketCorrect === bracketFinished) earned.push("PERFECT_BRACKET");
  if (finalChampionCorrect && finalRunnerUpCorrect) earned.push("DREAM_FINAL");
  const baseKeys = ["GOOD_START","GROUP_SPECIALIST","WORLD_EXPERT","GROUP_MACHINE",
    "SHARP_EYE","PERFECT_TABLE","STRONG_BRACKET","PERFECT_BRACKET","DREAM_FINAL"];
  if (baseKeys.every(k => earned.includes(k))) earned.push("PERFECT_PRODE");

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
    groupCorrect: 0,
    classifiedCorrect: 0,
    groupsChecked: 0,
    groupsPositionPerfect: 0,
    bracketCorrect: 0,
    bracketFinished: 0,
    finalChampionCorrect: false,
    finalRunnerUpCorrect: false,
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
      achievementStats.groupCorrect++;
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

    achievementStats.groupsChecked++;
    const { first, second } = calculateGroupQualifiers(gp.group.teams, gp.group.matches);
    let earned = 0;
    let positionPerfect = true;

    if (gp.firstTeamId) {
      if (gp.firstTeamId === first || gp.firstTeamId === second) {
        earned += pts("GROUP_CLASSIFIED");
        achievementStats.classifiedCorrect++;
        if (gp.firstTeamId === first) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
    }

    if (gp.secondTeamId) {
      if (gp.secondTeamId === first || gp.secondTeamId === second) {
        earned += pts("GROUP_CLASSIFIED");
        achievementStats.classifiedCorrect++;
        if (gp.secondTeamId === second) earned += pts("GROUP_POSITION");
        else positionPerfect = false;
      } else positionPerfect = false;
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

    const match = await prisma.match.findFirst({
      where: { matchCode: bp.matchSlot, status: "finished" },
    });

    if (!match) {
      if (bp.pointsEarned !== 0) await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: 0 } });
      continue;
    }

    achievementStats.bracketFinished++;
    let earned = 0;

    if (bp.phase === "FINAL" && match.winnerTeamId) {
      if (bp.predictedTeamId === match.winnerTeamId) {
        earned = pts("CHAMPION");
        achievementStats.bracketCorrect++;
        achievementStats.finalChampionCorrect = true;
      } else if (
        bp.predictedTeamId === match.homeTeamId ||
        bp.predictedTeamId === match.awayTeamId
      ) {
        // Predicted team was in the final but lost — runner-up
        earned = pts("RUNNER_UP");
        achievementStats.bracketCorrect++;
        achievementStats.finalRunnerUpCorrect = true;
      }
    } else {
      const ruleKey = phaseRuleMap[bp.phase];
      if (ruleKey && match.winnerTeamId && bp.predictedTeamId === match.winnerTeamId) {
        earned = pts(ruleKey);
        achievementStats.bracketCorrect++;
      }
    }

    predictionPoints += earned;
    if (bp.pointsEarned !== earned) {
      await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: earned } });
    }
  }

  // ── 4. Bonus points (bonus actions + purchase codes) ─────────────────────
  const [bonusAgg, codeAgg] = await Promise.all([
    prisma.userBonus.aggregate({ where: { userId, status: "approved" }, _sum: { pointsEarned: true } }),
    prisma.purchaseCode.aggregate({ where: { userId, status: "redeemed" }, _sum: { points: true } }),
  ]);
  const bonusPoints = (bonusAgg._sum.pointsEarned ?? 0) + (codeAgg._sum.points ?? 0);

  // ── 5. Achievements ──────────────────────────────────────────────────────
  const achievementPoints = await applyAchievements(userId, achievementStats);

  // ── 6. Update user ───────────────────────────────────────────────────────
  const totalPoints = predictionPoints + bonusPoints + achievementPoints;

  await prisma.user.update({
    where: { id: userId },
    data: { predictionPoints, bonusPoints, achievementPoints, totalPoints },
  });

  return totalPoints;
}
