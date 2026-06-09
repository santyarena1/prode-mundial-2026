import prisma from "./db";
import {
  BracketContext,
  bracketKey,
  getDownstreamBracketKeys,
  normalizeMatchSlot,
  normalizeSavedBracket,
  validateBracketPick,
} from "./bracket-validation";

export async function buildBracketContext(userId: string): Promise<BracketContext> {
  const [groups, predictions, groupPredictions, bracketPredictions] = await Promise.all([
    prisma.worldCupGroup.findMany({
      include: {
        teams: { select: { id: true, name: true, code: true, flagUrl: true } },
        matches: {
          where: { phase: "GROUP_STAGE" },
          select: { id: true, phase: true, homeTeamId: true, awayTeamId: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.prediction.findMany({
      where: { userId },
      select: {
        matchId: true,
        predictedOutcome: true,
        predictedHomeScore: true,
        predictedAwayScore: true,
      },
    }),
    prisma.groupPrediction.findMany({
      where: { userId },
      select: { groupId: true, firstTeamId: true, secondTeamId: true, thirdTeamId: true },
    }),
    prisma.bracketPrediction.findMany({
      where: { userId, predictedTeamId: { not: null } },
      select: { phase: true, matchSlot: true, predictedTeamId: true },
    }),
  ]);

  const allTeamsMap = new Map<string, { id: string; name: string; code: string; flagUrl?: string | null }>();
  for (const g of groups) {
    for (const t of g.teams) allTeamsMap.set(t.id, t);
  }

  const savedPreds: Record<string, string> = {};
  const savedScores: Record<string, { home: number; away: number }> = {};
  for (const p of predictions) {
    if (p.predictedOutcome) savedPreds[p.matchId] = p.predictedOutcome;
    if (
      p.predictedHomeScore !== null &&
      p.predictedHomeScore !== undefined &&
      p.predictedAwayScore !== null &&
      p.predictedAwayScore !== undefined
    ) {
      savedScores[p.matchId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
    }
  }

  const savedGroupPreds: Record<string, { first?: string; second?: string; third?: string }> = {};
  for (const gp of groupPredictions) {
    savedGroupPreds[gp.groupId] = {
      first: gp.firstTeamId ?? undefined,
      second: gp.secondTeamId ?? undefined,
      third: gp.thirdTeamId ?? undefined,
    };
  }

  const rawBracket: Record<string, string> = {};
  for (const bp of bracketPredictions) {
    if (!bp.predictedTeamId) continue;
    rawBracket[bracketKey(bp.phase, bp.matchSlot)] = bp.predictedTeamId;
  }

  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      teams: g.teams,
      matches: g.matches,
    })),
    allTeams: [...allTeamsMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    savedPreds,
    savedGroupPreds,
    savedBracket: normalizeSavedBracket(rawBracket),
    savedScores,
  };
}

export async function validateBracketPickForUser(
  userId: string,
  phase: string,
  matchSlot: string,
  teamId: string
): Promise<{ valid: boolean; error?: string }> {
  const ctx = await buildBracketContext(userId);
  return validateBracketPick(phase, matchSlot, teamId, ctx);
}

export async function clearDownstreamBracketPredictions(
  userId: string,
  phase: string,
  matchSlot: string
): Promise<number> {
  const keys = getDownstreamBracketKeys(phase, matchSlot);
  if (keys.length === 0) return 0;

  let deleted = 0;
  for (const key of keys) {
    const [p, slot] = key.split(":");
    const result = await prisma.bracketPrediction.deleteMany({
      where: {
        userId,
        phase: p,
        matchSlot: { in: [slot, normalizeMatchSlot(p, slot)] },
      },
    });
    deleted += result.count;
  }
  return deleted;
}

/** Migrate legacy matchSlot values (1..N) to FIFA numbers in DB */
export async function migrateLegacyBracketSlots(userId: string): Promise<number> {
  const preds = await prisma.bracketPrediction.findMany({ where: { userId } });
  let migrated = 0;

  for (const p of preds) {
    if (p.phase === "CHAMPION") continue;
    const normalized = normalizeMatchSlot(p.phase, p.matchSlot);
    if (normalized === p.matchSlot) continue;

    const existing = await prisma.bracketPrediction.findUnique({
      where: {
        userId_phase_matchSlot: { userId, phase: p.phase, matchSlot: normalized },
      },
    });

    if (existing) {
      await prisma.bracketPrediction.delete({ where: { id: p.id } });
    } else {
      await prisma.bracketPrediction.update({
        where: { id: p.id },
        data: { matchSlot: normalized },
      });
    }
    migrated++;
  }
  return migrated;
}
