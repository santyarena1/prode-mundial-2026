import { BRACKET_MATCHES, BracketMatch } from "./bracket-structure";

export const ELIMINATORIAS_PHASES = [
  { key: "ROUND_OF_32", label: "16vos", fullLabel: "Ronda de 32", slots: 16, icon: "⚽", ptsLabel: "2.000 pts c/u" },
  { key: "ROUND_OF_16", label: "8vos", fullLabel: "Octavos de Final", slots: 8, icon: "🔥", ptsLabel: "3.500 pts c/u" },
  { key: "QUARTER_FINALS", label: "4tos", fullLabel: "Cuartos de Final", slots: 4, icon: "⚡", ptsLabel: "6.000 pts c/u" },
  { key: "SEMI_FINALS", label: "Semis", fullLabel: "Semifinales", slots: 2, icon: "🌟", ptsLabel: "10.000 pts c/u" },
  { key: "CHAMPION", label: "Final", fullLabel: "Campeón del Mundo", slots: 1, icon: "🏆", ptsLabel: "30.000 / 15.000 pts" },
] as const;

export type ElimPhaseKey = (typeof ELIMINATORIAS_PHASES)[number]["key"];

export const PHASE_MATCH_NUMS: Record<string, number[]> = {
  ROUND_OF_32: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88],
  ROUND_OF_16: [89, 90, 91, 92, 93, 94, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
};

export interface BracketTeam {
  id: string;
  name: string;
  code: string;
  flagUrl?: string | null;
}

export interface BracketGroupMatch {
  id: string;
  phase: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
}

export interface BracketGroup {
  id: string;
  name: string;
  teams: BracketTeam[];
  matches: BracketGroupMatch[];
}

export interface BracketContext {
  groups: BracketGroup[];
  allTeams: BracketTeam[];
  savedPreds: Record<string, string>;
  savedGroupPreds: Record<string, { first?: string; second?: string; third?: string }>;
  /** Confirmed bracket picks only — pending picks must NOT feed downstream resolution */
  savedBracket: Record<string, string>;
  /** Pending (unconfirmed) bracket picks — used only for validation UX */
  pendingBracket?: Record<string, string>;
  savedScores?: Record<string, { home: number; away: number }>;
}

export interface ThirdPlaceRanking {
  teamId: string;
  groupLetter: string;
  groupId: string;
  pts: number;
  gd: number;
  gf: number;
  rank: number;
  qualifies: boolean;
  team: BracketTeam;
}

const BEST_THIRDS_COUNT = 8;

/** All R32 matches that include a third-place slot */
export function getThirdSlotMatches(): BracketMatch[] {
  return (BRACKET_MATCHES.ROUND_OF_32 ?? []).filter(
    (m) => m.leftSource.startsWith("3") || m.rightSource.startsWith("3")
  );
}

export function isGroupPredictionComplete(group: BracketGroup, ctx: BracketContext): boolean {
  const groupMatches = group.matches.filter((m) => m.phase === "GROUP_STAGE");
  return groupMatches.length > 0 && groupMatches.every((m) => !!ctx.savedPreds[m.id]);
}

/** Standings derived from saved match predictions — same logic as the group table UI */
export function deriveProjectedGroupStandings(
  group: BracketGroup,
  ctx: BracketContext
): { first: string | null; second: string | null; third: string | null } | null {
  if (!isGroupPredictionComplete(group, ctx)) return null;

  const stats = computeGroupTeamStats(group, ctx);
  const sorted = group.teams
    .map((t) => ({ id: t.id, ...(stats[t.id] ?? { pts: 0, gd: 0, gf: 0 }) }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return {
    first: sorted[0]?.id ?? null,
    second: sorted[1]?.id ?? null,
    third: sorted[2]?.id ?? null,
  };
}

function getGroupPositions(
  group: BracketGroup,
  ctx: BracketContext
): { first?: string; second?: string; third?: string } {
  const derived = deriveProjectedGroupStandings(group, ctx);
  if (derived) {
    return {
      first: derived.first ?? undefined,
      second: derived.second ?? undefined,
      third: derived.third ?? undefined,
    };
  }
  return ctx.savedGroupPreds[group.id] ?? {};
}

function computeGroupTeamStats(
  group: BracketGroup,
  ctx: BracketContext
): Record<string, { pts: number; gd: number; gf: number }> {
  const stats: Record<string, { pts: number; gd: number; gf: number }> = {};
  for (const t of group.teams) stats[t.id] = { pts: 0, gd: 0, gf: 0 };

  for (const m of group.matches) {
    if (m.phase !== "GROUP_STAGE") continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const outcome = ctx.savedPreds[m.id];
    if (!outcome) continue;

    if (!stats[m.homeTeamId]) stats[m.homeTeamId] = { pts: 0, gd: 0, gf: 0 };
    if (!stats[m.awayTeamId]) stats[m.awayTeamId] = { pts: 0, gd: 0, gf: 0 };

    if (outcome === "home") stats[m.homeTeamId].pts += 3;
    else if (outcome === "away") stats[m.awayTeamId].pts += 3;
    else {
      stats[m.homeTeamId].pts += 1;
      stats[m.awayTeamId].pts += 1;
    }

    const score = ctx.savedScores?.[m.id];
    if (score) {
      stats[m.homeTeamId].gd += score.home - score.away;
      stats[m.awayTeamId].gd += score.away - score.home;
      stats[m.homeTeamId].gf += score.home;
      stats[m.awayTeamId].gf += score.away;
    }
  }

  return stats;
}

/** Projected 3rd-place finishers ranked — top 8 qualify for R32 */
export function computeThirdPlaceRankings(ctx: BracketContext): ThirdPlaceRanking[] {
  const entries: Omit<ThirdPlaceRanking, "rank" | "qualifies">[] = [];

  for (const group of ctx.groups) {
    const standings = deriveProjectedGroupStandings(group, ctx);
    if (!standings?.third) continue;

    const stats = computeGroupTeamStats(group, ctx);
    const s = stats[standings.third] ?? { pts: 0, gd: 0, gf: 0 };
    const team = ctx.allTeams.find((t) => t.id === standings.third);
    if (!team) continue;

    entries.push({
      teamId: standings.third,
      groupLetter: group.name,
      groupId: group.id,
      pts: s.pts,
      gd: s.gd,
      gf: s.gf,
      team,
    });
  }

  entries.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return entries.map((e, i) => ({
    ...e,
    rank: i + 1,
    qualifies: i < BEST_THIRDS_COUNT,
  }));
}

export function getQualifyingThirdTeamIds(ctx: BracketContext): Set<string> {
  return new Set(
    computeThirdPlaceRankings(ctx)
      .filter((r) => r.qualifies)
      .map((r) => r.teamId)
  );
}

export function getAllProjectedThirdTeamIds(ctx: BracketContext): Set<string> {
  const ids = new Set<string>();
  for (const group of ctx.groups) {
    const third = deriveProjectedGroupStandings(group, ctx)?.third
      ?? ctx.savedGroupPreds[group.id]?.third;
    if (third) ids.add(third);
  }
  return ids;
}

export function isProjectedThirdTeamId(ctx: BracketContext, teamId: string): boolean {
  return getAllProjectedThirdTeamIds(ctx).has(teamId);
}

export function getThirdSideSource(match: BracketMatch): string | null {
  if (match.leftSource.startsWith("3")) return match.leftSource;
  if (match.rightSource.startsWith("3")) return match.rightSource;
  return null;
}

/** Third-place teams assigned to R32 slots (only actual 3° picks, not 1°/2° winners) */
export function getAssignedThirdTeamIds(
  ctx: BracketContext,
  bracket: Record<string, string>,
  excludeKey?: string
): Set<string> {
  const assigned = new Set<string>();
  const projectedThirds = getAllProjectedThirdTeamIds(ctx);

  for (const match of getThirdSlotMatches()) {
    const key = bracketKey("ROUND_OF_32", String(match.matchNum));
    if (excludeKey && key === excludeKey) continue;
    const teamId = bracket[key];
    if (teamId && projectedThirds.has(teamId)) assigned.add(teamId);
  }

  return assigned;
}

/** @deprecated use getAssignedThirdTeamIds */
export function getUsedThirdPlaceTeamIds(
  savedBracket: Record<string, string>,
  excludeKey?: string
): Set<string> {
  const used = new Set<string>();
  for (const match of getThirdSlotMatches()) {
    const key = bracketKey("ROUND_OF_32", String(match.matchNum));
    if (excludeKey && key === excludeKey) continue;
    const teamId = savedBracket[key];
    if (teamId) used.add(teamId);
  }
  return used;
}

export function getUsedThirdPlaceTeamIdsFromContext(
  ctx: BracketContext,
  savedBracket: Record<string, string>,
  pendingBracket: Record<string, string> = {},
  excludeKey?: string
): Set<string> {
  const used = getAssignedThirdTeamIds(ctx, savedBracket, excludeKey);
  for (const [key, teamId] of Object.entries(pendingBracket)) {
    if (!key.startsWith("ROUND_OF_32:")) continue;
    if (excludeKey && key === excludeKey) continue;
    if (isProjectedThirdTeamId(ctx, teamId)) used.add(teamId);
  }
  return used;
}

/** Maps legacy numeric slots (1..N) to FIFA match numbers */
export function normalizeMatchSlot(phase: string, matchSlot: string): string {
  if (phase === "CHAMPION") return matchSlot;
  const nums = PHASE_MATCH_NUMS[phase];
  if (!nums) return matchSlot;
  const n = parseInt(matchSlot, 10);
  if (Number.isNaN(n)) return matchSlot;
  if (nums.includes(n)) return String(n);
  if (n >= 1 && n <= nums.length) return String(nums[n - 1]);
  return matchSlot;
}

export function bracketKey(phase: string, matchSlot: string): string {
  return `${phase}:${normalizeMatchSlot(phase, matchSlot)}`;
}

/** Normalize saved bracket map keys (handles legacy slot format) */
export function normalizeSavedBracket(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, teamId] of Object.entries(raw)) {
    const [phase, slot] = key.split(":");
    if (!phase || !slot || !teamId) continue;
    out[bracketKey(phase, slot)] = teamId;
  }
  return out;
}

export function getPhaseForMatchNum(matchNum: number): string | null {
  for (const [phase, nums] of Object.entries(PHASE_MATCH_NUMS)) {
    if (nums.includes(matchNum)) return phase;
  }
  if (matchNum === 103) return "FINAL";
  return null;
}

export function resolveSource(source: string, ctx: BracketContext): BracketTeam | null {
  if (source.startsWith("W")) {
    const matchNum = source.slice(1);
    const phase = getPhaseForMatchNum(parseInt(matchNum, 10));
    if (!phase) return null;
    const teamId = ctx.savedBracket[bracketKey(phase, matchNum)];
    return ctx.allTeams.find((t) => t.id === teamId) ?? null;
  }
  if (source.startsWith("3")) return null;

  const pos = source[0];
  const groupLetter = source[1];
  const group = ctx.groups.find((g) => g.name === groupLetter);
  if (!group) return null;
  const gp = getGroupPositions(group, ctx);
  const teamId = pos === "1" ? gp.first : gp.second;
  if (!teamId) return null;
  return ctx.allTeams.find((t) => t.id === teamId) ?? null;
}

export function resolveMatchTeams(
  match: BracketMatch,
  ctx: BracketContext,
  thirdPickTeamId?: string | null
): { left: BracketTeam | null; right: BracketTeam | null } {
  let left = resolveSource(match.leftSource, ctx);
  let right = resolveSource(match.rightSource, ctx);

  if (match.leftSource.startsWith("3") && thirdPickTeamId) {
    left = ctx.allTeams.find((t) => t.id === thirdPickTeamId) ?? null;
  }
  if (match.rightSource.startsWith("3") && thirdPickTeamId) {
    right = ctx.allTeams.find((t) => t.id === thirdPickTeamId) ?? null;
  }

  return { left, right };
}

export function getThirdPlaceCandidates(
  source: string,
  ctx: BracketContext,
  excludeTeamIds: Set<string> = new Set()
): BracketTeam[] {
  if (!source.startsWith("3")) return [];
  const qualifying = getQualifyingThirdTeamIds(ctx);
  const groupLetters = source.slice(1).split("");
  const teams: BracketTeam[] = [];
  for (const letter of groupLetters) {
    const group = ctx.groups.find((g) => g.name === letter);
    if (!group) continue;
    const third =
      deriveProjectedGroupStandings(group, ctx)?.third
      ?? ctx.savedGroupPreds[group.id]?.third;
    if (!third) continue;
    if (!qualifying.has(third)) continue;
    if (excludeTeamIds.has(third)) continue;
    const team = ctx.allTeams.find((t) => t.id === third);
    if (team) teams.push(team);
  }
  return teams;
}

/** Resolve one side of a bracket match for display / validation */
export function resolveBracketSideTeam(
  source: string,
  pickedTeamId: string | null | undefined,
  ctx: BracketContext
): BracketTeam | null {
  if (source.startsWith("3")) {
    if (!pickedTeamId || !isProjectedThirdTeamId(ctx, pickedTeamId)) return null;
    return ctx.allTeams.find((t) => t.id === pickedTeamId) ?? null;
  }
  return resolveSource(source, ctx);
}

export function isGroupStageComplete(ctx: BracketContext): boolean {
  if (ctx.groups.length === 0) return false;
  return ctx.groups.every((group) => isGroupPredictionComplete(group, ctx));
}

export function countCompletedGroups(ctx: BracketContext): number {
  return ctx.groups.filter((group) => {
    const groupMatches = group.matches.filter((m) => m.phase === "GROUP_STAGE");
    return groupMatches.length > 0 && groupMatches.every((m) => !!ctx.savedPreds[m.id]);
  }).length;
}

export function isPhaseUnlocked(phaseKey: string, ctx: BracketContext): boolean {
  const idx = ELIMINATORIAS_PHASES.findIndex((p) => p.key === phaseKey);
  if (idx < 0) return false;
  if (idx === 0) return isGroupStageComplete(ctx);

  const prev = ELIMINATORIAS_PHASES[idx - 1];
  if (prev.key === "SEMI_FINALS") {
    const semiNums = PHASE_MATCH_NUMS.SEMI_FINALS ?? [];
    return semiNums.every((num) => !!ctx.savedBracket[bracketKey("SEMI_FINALS", String(num))]);
  }

  const prevMatchNums = PHASE_MATCH_NUMS[prev.key];
  if (prevMatchNums) {
    return prevMatchNums.every(
      (num) => !!ctx.savedBracket[bracketKey(prev.key, String(num))]
    );
  }

  return (
    Object.keys(ctx.savedBracket).filter((k) => k.startsWith(`${prev.key}:`)).length >=
    prev.slots
  );
}

export function getPhaseUnlockBlockReason(phaseKey: string, ctx: BracketContext): string | null {
  if (isPhaseUnlocked(phaseKey, ctx)) return null;
  const idx = ELIMINATORIAS_PHASES.findIndex((p) => p.key === phaseKey);
  if (idx === 0) {
    const incomplete = ctx.groups.filter((group) => {
      const groupMatches = group.matches.filter((m) => m.phase === "GROUP_STAGE");
      return !(groupMatches.length > 0 && groupMatches.every((m) => !!ctx.savedPreds[m.id]));
    });
    if (incomplete.length === 0) return "Completá todos los partidos de fase de grupos.";
    const names = incomplete.map((g) => `Grupo ${g.name}`).join(", ");
    return `Faltan predicciones en: ${names}.`;
  }

  const prev = ELIMINATORIAS_PHASES[idx - 1];
  const prevMatchNums = PHASE_MATCH_NUMS[prev.key];
  if (prevMatchNums) {
    const missing = prevMatchNums.filter(
      (num) => !ctx.savedBracket[bracketKey(prev.key, String(num))]
    );
    if (missing.length > 0) {
      return `Confirmá ${missing.length} selección${missing.length > 1 ? "es" : ""} pendiente${missing.length > 1 ? "s" : ""} en ${prev.fullLabel} (partidos P${missing.slice(0, 3).join(", P")}${missing.length > 3 ? "…" : ""}).`;
    }
  }
  return `Completá y confirmá ${prev.fullLabel} primero.`;
}

export function getEligibleChampionTeams(ctx: BracketContext): BracketTeam[] {
  const semiNums = PHASE_MATCH_NUMS.SEMI_FINALS ?? [];
  const ids = semiNums
    .map((num) => ctx.savedBracket[bracketKey("SEMI_FINALS", String(num))])
    .filter(Boolean) as string[];
  return ctx.allTeams.filter((t) => ids.includes(t.id));
}

export function validateBracketPick(
  phase: string,
  matchSlot: string,
  teamId: string,
  ctx: BracketContext
): { valid: boolean; error?: string } {
  const slot = normalizeMatchSlot(phase, matchSlot);
  const key = bracketKey(phase, slot);

  if (phase === "CHAMPION") {
    const eligible = getEligibleChampionTeams(ctx);
    if (!eligible.some((t) => t.id === teamId)) {
      return { valid: false, error: "El campeón debe ser uno de los ganadores de semifinal." };
    }
    return { valid: true };
  }

  const matches = BRACKET_MATCHES[phase];
  const match = matches?.find((m) => m.matchNum === parseInt(slot, 10));
  if (!match) return { valid: false, error: "Partido de llave inválido." };

  const existingPick = ctx.savedBracket[key];
  const isThirdSlot = match.leftSource.startsWith("3") || match.rightSource.startsWith("3");
  const { left, right } = resolveMatchTeams(match, ctx);

  if (isThirdSlot) {
    const fixedSide = match.leftSource.startsWith("3") ? right : left;
    if (fixedSide && fixedSide.id === teamId) return { valid: true };

    if (!isProjectedThirdTeamId(ctx, teamId)) {
      return { valid: false, error: "Solo podés elegir uno de los dos equipos del cruce." };
    }

    const sideSource = getThirdSideSource(match)!;
    const bracketForAssignment = { ...ctx.savedBracket, ...ctx.pendingBracket };
    const exclude = getAssignedThirdTeamIds(ctx, bracketForAssignment, key);
    const candidates = getThirdPlaceCandidates(sideSource, ctx, exclude);
    if (!candidates.some((t) => t.id === teamId)) {
      if (exclude.has(teamId)) {
        return { valid: false, error: "Ese tercero ya fue asignado a otro cruce." };
      }
      const qualifying = getQualifyingThirdTeamIds(ctx);
      if (!qualifying.has(teamId)) {
        return { valid: false, error: "Ese tercero no está entre los 8 mejores según tu tabla de grupos." };
      }
      return { valid: false, error: "El equipo no es candidato válido para este cruce." };
    }
    return { valid: true };
  }

  if (!left || !right) {
    return { valid: false, error: "Los equipos del cruce aún no están definidos." };
  }
  if (teamId !== left.id && teamId !== right.id) {
    return { valid: false, error: "Solo podés elegir uno de los dos equipos del cruce." };
  }
  if (existingPick && existingPick !== teamId) {
    // allowed when unlocking — caller handles downstream
  }
  return { valid: true };
}

/** Returns bracket keys that depend on a changed upstream winner (for invalidation) */
export function getDownstreamBracketKeys(changedPhase: string, changedSlot: string): string[] {
  const slot = normalizeMatchSlot(changedPhase, changedSlot);
  const changedMatchNum = changedPhase === "CHAMPION" ? null : parseInt(slot, 10);
  const toClear: string[] = [];

  if (changedPhase === "CHAMPION") return toClear;

  const winnerRef = `W${changedMatchNum}`;

  for (const phase of Object.keys(BRACKET_MATCHES)) {
    for (const match of BRACKET_MATCHES[phase] ?? []) {
      const key = bracketKey(phase, String(match.matchNum));
      if (match.leftSource === winnerRef || match.rightSource === winnerRef) {
        toClear.push(key);
        toClear.push(...getDownstreamBracketKeys(phase, String(match.matchNum)));
      }
    }
  }

  if (changedPhase === "SEMI_FINALS") {
    toClear.push(bracketKey("CHAMPION", "1"));
  }

  return [...new Set(toClear)];
}

export function isBracketPickStale(
  phase: string,
  matchSlot: string,
  pickedTeamId: string | null | undefined,
  ctx: BracketContext
): boolean {
  if (!pickedTeamId) return false;
  if (phase === "CHAMPION") {
    return !getEligibleChampionTeams(ctx).some((t) => t.id === pickedTeamId);
  }

  const slot = normalizeMatchSlot(phase, matchSlot);
  const match = (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === parseInt(slot, 10));
  if (!match) return false;

  const isThird = match.leftSource.startsWith("3") || match.rightSource.startsWith("3");
  const { left, right } = resolveMatchTeams(match, ctx, isThird ? pickedTeamId : undefined);

  if (isThird) {
    const fixed = resolveSource(
      match.leftSource.startsWith("3") ? match.rightSource : match.leftSource,
      ctx
    );
    if (fixed && pickedTeamId === fixed.id) return false;

    const sideSource = getThirdSideSource(match)!;
    const exclude = getAssignedThirdTeamIds(ctx, ctx.savedBracket, bracketKey(phase, slot));
    if (!getQualifyingThirdTeamIds(ctx).has(pickedTeamId)) return true;
    return !getThirdPlaceCandidates(sideSource, ctx, exclude).some((t) => t.id === pickedTeamId);
  }

  if (!left || !right) return true;
  return pickedTeamId !== left.id && pickedTeamId !== right.id;
}

export function getBracketMatchByKey(phase: string, matchSlot: string): BracketMatch | undefined {
  const slot = normalizeMatchSlot(phase, matchSlot);
  return (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === parseInt(slot, 10));
}
