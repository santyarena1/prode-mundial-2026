import prisma from "./db";
import {
  BracketContext,
  bracketKey,
  deriveThirdSlotAssignmentsFromBracket,
  getDownstreamBracketKeys,
  normalizeMatchSlot,
  normalizeSavedBracket,
  validateBracketPick,
} from "./bracket-validation";
import { getTournamentPhaseState } from "./tournament-phase";

export async function buildBracketContext(userId: string): Promise<BracketContext> {
  const [groups, predictions, groupPredictions, bracketPredictions, phaseState] = await Promise.all([
    prisma.worldCupGroup.findMany({
      include: {
        teams: { select: { id: true, name: true, code: true, flagUrl: true } },
        matches: {
          where: { phase: "GROUP_STAGE" },
          select: {
            id: true, phase: true, homeTeamId: true, awayTeamId: true,
            status: true, realOutcome: true, homeScore: true, awayScore: true,
          },
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
    getTournamentPhaseState(),
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

  // Rellená con el resultado REAL los partidos de grupo ya jugados que el usuario
  // no predijo. Así el bracket del lado servidor se resuelve igual que en el
  // cliente y los usuarios con partidos sin predecir pueden guardar bien sus
  // selecciones de 16vos en adelante (no quedan trabados por partidos pasados).
  for (const g of groups) {
    for (const m of g.matches) {
      if (m.status === "finished" && !savedPreds[m.id] && m.realOutcome) {
        savedPreds[m.id] = m.realOutcome;
      }
      if (
        m.status === "finished" &&
        savedScores[m.id] === undefined &&
        m.homeScore !== null &&
        m.homeScore !== undefined &&
        m.awayScore !== null &&
        m.awayScore !== undefined
      ) {
        savedScores[m.id] = { home: m.homeScore, away: m.awayScore };
      }
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

  const savedBracket = normalizeSavedBracket(rawBracket);
  const mappedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    teams: g.teams,
    matches: g.matches,
  }));
  const allTeams = [...allTeamsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const tournamentPhases: Record<string, { started: boolean; finished: boolean }> = {};
  for (const [key, p] of Object.entries(phaseState.phases)) {
    tournamentPhases[key] = { started: p.started, finished: p.finished };
  }

  const ctx: BracketContext = {
    groups: mappedGroups,
    allTeams,
    savedPreds,
    savedGroupPreds,
    savedBracket,
    savedScores,
    tournamentPhases,
  };

  return {
    ...ctx,
    thirdSlotAssignments: deriveThirdSlotAssignmentsFromBracket(ctx, savedBracket),
  };
}

export async function validateBracketPickForUser(
  userId: string,
  phase: string,
  matchSlot: string,
  teamId: string,
  assignedThirdTeamId?: string
): Promise<{ valid: boolean; error?: string }> {
  const ctx = await buildBracketContext(userId);
  if (assignedThirdTeamId) {
    const key = bracketKey(phase, matchSlot);
    ctx.thirdSlotAssignments = {
      ...deriveThirdSlotAssignmentsFromBracket(ctx),
      [key]: assignedThirdTeamId,
    };
  }
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
