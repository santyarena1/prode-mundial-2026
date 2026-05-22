import prisma from "./db";

export const DEFAULT_POINT_RULES = {
  GROUP_SIGN: { label: "Acertar resultado grupo (ganador/empate)", points: 3 },
  GROUP_DRAW_BONUS: { label: "Bonus acertar empate exacto", points: 1 },
  GROUP_CLASSIFIED: { label: "Acertar clasificado a Ronda de 32", points: 8 },
  GROUP_POSITION: { label: "Acertar posición exacta en grupo", points: 5 },
  ROUND_OF_32: { label: "Acertar equipo que pasa a octavos", points: 10 },
  ROUND_OF_16: { label: "Acertar equipo que pasa a cuartos", points: 15 },
  QUARTER_FINALS: { label: "Acertar equipo que pasa a semis", points: 22 },
  SEMI_FINALS: { label: "Acertar equipo que pasa a final", points: 30 },
  CHAMPION: { label: "Acertar campeón", points: 60 },
  RUNNER_UP: { label: "Acertar subcampeón", points: 30 },
  FINAL_EXACT: { label: "Acertar final completa", points: 40 },
  SPECIAL_CHAMPION: { label: "Campeón predicho antes del torneo", points: 60 },
  SPECIAL_TOP_SCORER: { label: "Goleador del torneo", points: 40 },
  SPECIAL_REVELATION: { label: "Selección revelación", points: 20 },
  SPECIAL_BEST_PLAYER: { label: "Mejor jugador", points: 30 },
};

export async function calculateUserPoints(userId: string): Promise<number> {
  // Get point rules from DB
  const pointRules = await prisma.pointRule.findMany({ where: { active: true } });
  const ruleMap: Record<string, number> = {};
  for (const rule of pointRules) {
    ruleMap[rule.key] = rule.points;
  }

  let predictionPoints = 0;

  // Calculate match prediction points
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
  });

  for (const prediction of predictions) {
    const match = prediction.match;
    if (match.status !== "finished" || !match.realOutcome) continue;

    let earned = 0;

    // Group stage sign (win/draw/loss)
    if (
      prediction.predictedOutcome &&
      prediction.predictedOutcome === match.realOutcome &&
      match.phase === "GROUP_STAGE"
    ) {
      earned += ruleMap["GROUP_SIGN"] ?? DEFAULT_POINT_RULES.GROUP_SIGN.points;
      // Bonus for predicting a draw
      if (match.realOutcome === "draw") {
        earned += ruleMap["GROUP_DRAW_BONUS"] ?? DEFAULT_POINT_RULES.GROUP_DRAW_BONUS.points;
      }
    }

    predictionPoints += earned;

    // Update prediction record
    await prisma.prediction.update({
      where: { id: prediction.id },
      data: { pointsEarned: earned },
    });
  }

  // Calculate bracket prediction points
  const bracketPredictions = await prisma.bracketPrediction.findMany({
    where: { userId },
  });

  for (const bp of bracketPredictions) {
    if (!bp.predictedTeamId) continue;

    // Find finished matches for this phase/slot
    const match = await prisma.match.findFirst({
      where: {
        matchCode: bp.matchSlot,
        status: "finished",
      },
    });

    if (!match || !match.winnerTeamId) continue;

    let earned = 0;
    if (bp.predictedTeamId === match.winnerTeamId) {
      const phaseRuleMap: Record<string, string> = {
        ROUND_OF_32: "ROUND_OF_32",
        ROUND_OF_16: "ROUND_OF_16",
        QUARTER_FINALS: "QUARTER_FINALS",
        SEMI_FINALS: "SEMI_FINALS",
        FINAL: "CHAMPION",
      };
      const ruleKey = phaseRuleMap[bp.phase];
      if (ruleKey) {
        earned = ruleMap[ruleKey] ?? 0;
      }
    }

    predictionPoints += earned;
    await prisma.bracketPrediction.update({
      where: { id: bp.id },
      data: { pointsEarned: earned },
    });
  }

  // Bonus: acciones aprobadas + códigos de compra canjeados
  const [bonusAggregate, purchaseCodeAggregate] = await Promise.all([
    prisma.userBonus.aggregate({
      where: { userId, status: "approved" },
      _sum: { pointsEarned: true },
    }),
    prisma.purchaseCode.aggregate({
      where: { userId, status: "redeemed" },
      _sum: { points: true },
    }),
  ]);
  const bonusPoints =
    (bonusAggregate._sum.pointsEarned ?? 0) + (purchaseCodeAggregate._sum.points ?? 0);

  const totalPoints = predictionPoints + bonusPoints;

  await prisma.user.update({
    where: { id: userId },
    data: {
      predictionPoints,
      bonusPoints,
      totalPoints,
    },
  });

  return totalPoints;
}
