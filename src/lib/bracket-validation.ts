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
  /** Which 3° plays each third-slot R32 match (rival del cruce) */
  thirdSlotAssignments?: Record<string, string>;
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

function getMergedThirdSlotAssignments(ctx: BracketContext): Record<string, string> {
  return ctx.thirdSlotAssignments ?? {};
}

/** Infer third-slot rivals from saved winners (when the saved winner is a projected 3°) */
export function deriveThirdSlotAssignmentsFromBracket(
  ctx: BracketContext,
  bracket: Record<string, string> = ctx.savedBracket,
  extra: Record<string, string> = {}
): Record<string, string> {
  const merged: Record<string, string> = { ...extra };
  for (const match of getThirdSlotMatches()) {
    const key = bracketKey("ROUND_OF_32", String(match.matchNum));
    if (merged[key]) continue;
    const winnerId = bracket[key];
    if (winnerId && isProjectedThirdTeamId(ctx, winnerId)) {
      merged[key] = winnerId;
    }
  }
  return merged;
}

/** Third-place teams assigned to R32 slots */
export function getAssignedThirdTeamIds(
  ctx: BracketContext,
  bracket: Record<string, string>,
  excludeKey?: string
): Set<string> {
  const assigned = new Set<string>();
  const projectedThirds = getAllProjectedThirdTeamIds(ctx);
  const assignments = getMergedThirdSlotAssignments(ctx);

  for (const match of getThirdSlotMatches()) {
    const key = bracketKey("ROUND_OF_32", String(match.matchNum));
    if (excludeKey && key === excludeKey) continue;

    const rivalId = assignments[key];
    if (rivalId && projectedThirds.has(rivalId)) assigned.add(rivalId);

    const winnerId = bracket[key];
    if (winnerId && projectedThirds.has(winnerId)) assigned.add(winnerId);
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
    const key = bracketKey(phase, matchNum);
    const teamId = ctx.savedBracket[key] ?? ctx.pendingBracket?.[key];
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

export interface ThirdPlaceCandidateEntry {
  team: BracketTeam;
  groupLetter: string;
  qualifies: boolean;
}

function getProjectedThirdForGroup(
  group: BracketGroup,
  ctx: BracketContext
): string | null {
  return (
    deriveProjectedGroupStandings(group, ctx)?.third
    ?? ctx.savedGroupPreds[group.id]?.third
    ?? null
  );
}

/** All projected 3° from candidate groups of a slot (ignores assignment / top-8 filter) */
export function getSlotProjectedThirds(source: string, ctx: BracketContext): BracketTeam[] {
  if (!source.startsWith("3")) return [];
  const teams: BracketTeam[] = [];
  for (const letter of source.slice(1).split("")) {
    const group = ctx.groups.find((g) => g.name === letter);
    if (!group) continue;
    const third = getProjectedThirdForGroup(group, ctx);
    if (!third) continue;
    const team = ctx.allTeams.find((t) => t.id === third);
    if (team) teams.push(team);
  }
  return teams;
}

/** Assignable 3° for a bracket slot — includes non-top-8 when needed to complete the llave */
export function getThirdPlaceCandidateEntries(
  source: string,
  ctx: BracketContext,
  excludeTeamIds: Set<string> = new Set()
): ThirdPlaceCandidateEntry[] {
  if (!source.startsWith("3")) return [];
  const qualifying = getQualifyingThirdTeamIds(ctx);
  const entries: ThirdPlaceCandidateEntry[] = [];

  for (const letter of source.slice(1).split("")) {
    const group = ctx.groups.find((g) => g.name === letter);
    if (!group) continue;
    const third = getProjectedThirdForGroup(group, ctx);
    if (!third || excludeTeamIds.has(third)) continue;
    const team = ctx.allTeams.find((t) => t.id === third);
    if (!team) continue;
    entries.push({
      team,
      groupLetter: letter,
      qualifies: qualifying.has(third),
    });
  }

  entries.sort(
    (a, b) =>
      Number(b.qualifies) - Number(a.qualifies) ||
      a.groupLetter.localeCompare(b.groupLetter)
  );

  return entries;
}

function getGroupLetterForThirdTeam(teamId: string, ctx: BracketContext): string {
  for (const group of ctx.groups) {
    const third =
      getProjectedThirdForGroup(group, ctx);
    if (third === teamId) return group.name;
  }
  return "?";
}

/** Picker options for a third-slot match — same list used for assign + validation */
export function getThirdSlotPickerEntries(
  match: BracketMatch,
  ctx: BracketContext,
  excludeKey: string
): ThirdPlaceCandidateEntry[] {
  const thirdSource = getThirdSideSource(match);
  if (!thirdSource) return [];

  const bracketForAssignment = { ...ctx.savedBracket, ...(ctx.pendingBracket ?? {}) };
  const exclude = getAssignedThirdTeamIds(ctx, bracketForAssignment, excludeKey);
  const entries = getThirdPlaceCandidateEntries(thirdSource, ctx, exclude);
  const assignedId = ctx.thirdSlotAssignments?.[excludeKey];
  if (assignedId && !entries.some((e) => e.team.id === assignedId)) {
    const slotTeams = getSlotProjectedThirds(thirdSource, ctx);
    const team = slotTeams.find((t) => t.id === assignedId);
    if (team) {
      const qualifying = getQualifyingThirdTeamIds(ctx);
      entries.push({
        team,
        groupLetter: getGroupLetterForThirdTeam(assignedId, ctx),
        qualifies: qualifying.has(assignedId),
      });
      entries.sort(
        (a, b) =>
          Number(b.qualifies) - Number(a.qualifies) ||
          a.groupLetter.localeCompare(b.groupLetter)
      );
    }
  }
  return entries;
}

export type BracketMatchStep = "missing_teams" | "pick_rival" | "pick_winner" | "complete";

export type BracketMatchCompleteness = {
  isThirdSlot: boolean;
  hasBothTeams: boolean;
  hasRival: boolean;
  hasWinner: boolean;
  isComplete: boolean;
  step: BracketMatchStep;
};

export function isThirdSlotMatch(match: BracketMatch): boolean {
  return match.leftSource.startsWith("3") || match.rightSource.startsWith("3");
}

export function getBracketMatchCompleteness(
  match: BracketMatch,
  ctx: BracketContext,
  key: string,
  winnerId?: string | null
): BracketMatchCompleteness {
  const winner =
    winnerId ??
    ctx.pendingBracket?.[key] ??
    ctx.savedBracket[key] ??
    null;

  if (!isThirdSlotMatch(match)) {
    const { left, right } = resolveMatchTeams(match, ctx);
    const hasBothTeams = !!(left && right);
    const hasWinner = !!(
      winner &&
      hasBothTeams &&
      (winner === left!.id || winner === right!.id)
    );
    return {
      isThirdSlot: false,
      hasBothTeams,
      hasRival: hasBothTeams,
      hasWinner,
      isComplete: hasBothTeams && hasWinner,
      step: !hasBothTeams ? "missing_teams" : !hasWinner ? "pick_winner" : "complete",
    };
  }

  const state = getThirdSlotPickState(match, winner, ctx, key);
  const fixedTeam = state?.fixedTeam ?? null;
  const rivalId = ctx.thirdSlotAssignments?.[key] ?? null;
  const entries = getThirdSlotPickerEntries(match, ctx, key);
  const hasBothTeams = !!fixedTeam && !!rivalId && entries.some((e) => e.team.id === rivalId);
  const hasRival = !!rivalId && entries.some((e) => e.team.id === rivalId);
  const hasWinner = !!(
    winner &&
    fixedTeam &&
    rivalId &&
    (winner === fixedTeam.id || winner === rivalId)
  );

  let step: BracketMatchStep = "complete";
  if (!fixedTeam) step = "missing_teams";
  else if (!hasRival) step = "pick_rival";
  else if (!hasWinner) step = "pick_winner";

  return {
    isThirdSlot: true,
    hasBothTeams,
    hasRival,
    hasWinner,
    isComplete: hasBothTeams && hasWinner,
    step,
  };
}

export function getBracketMatchIncompleteMessage(
  match: BracketMatch,
  ctx: BracketContext,
  key: string,
  winnerId?: string | null
): string {
  const c = getBracketMatchCompleteness(match, ctx, key, winnerId);
  const state = getThirdSlotPickState(match, winnerId, ctx, key);
  const fixed = state?.fixedTeam;
  const rivalId = ctx.thirdSlotAssignments?.[key];
  const rival = rivalId ? ctx.allTeams.find((t) => t.id === rivalId) : null;

  if (c.step === "missing_teams") {
    if (c.isThirdSlot) {
      const fixedSource = match.leftSource.startsWith("3") ? match.rightSource : match.leftSource;
      return formatBracketMatchError(
        match.matchNum,
        `Completá las predicciones del Grupo ${fixedSource[1] ?? "?"} para ver el rival directo de este cruce.`
      );
    }
    return formatBracketMatchError(
      match.matchNum,
      "Faltan equipos en el cruce. Confirmá los partidos de la ronda anterior."
    );
  }
  if (c.step === "pick_rival") {
    const groupsHint = state?.thirdSource.slice(1).split("").join(", ") ?? "";
    const options = getThirdSlotPickerEntries(match, ctx, key)
      .map((e) => `${e.team.name} (3° ${e.groupLetter})`)
      .join(", ");
    return formatBracketMatchError(
      match.matchNum,
      options
        ? `Elegí qué tercero juega este cruce: ${options}.`
        : `No hay terceros disponibles para grupos ${groupsHint}.`
    );
  }
  if (c.step === "pick_winner") {
    const hint = formatMatchPickHint(match, ctx, key);
    return formatBracketMatchError(match.matchNum, hint.replace(/^Tocá /, "Tocá quién pasa: ").replace(/^Elegí /, "Elegí quién pasa: "));
  }
  return formatBracketMatchError(match.matchNum, "Selección incompleta.");
}

export function countSaveableBracketPicks(
  phase: string,
  pending: Record<string, string>,
  ctx: BracketContext
): number {
  let count = 0;
  for (const [key, teamId] of Object.entries(pending)) {
    if (!key.startsWith(`${phase}:`)) continue;
    const [p, slot] = key.split(":");
    if (!p || !slot) continue;
    const matchNum = parseInt(normalizeMatchSlot(p, slot), 10);
    const match = (BRACKET_MATCHES[p] ?? []).find((m) => m.matchNum === matchNum);
    if (!match) continue;
    if (getBracketMatchCompleteness(match, ctx, key, teamId).isComplete) count++;
  }
  return count;
}

export interface ThirdSlotPickState {
  fixedTeam: BracketTeam | null;
  thirdSource: string;
  entries: ThirdPlaceCandidateEntry[];
  thirdPickedTeam: BracketTeam | null;
  fixedPicked: boolean;
  allowedTeamIds: Set<string>;
}

/** Single source of truth for third-slot picks: UI options === validation */
export function getThirdSlotPickState(
  match: BracketMatch,
  pickedTeamId: string | null | undefined,
  ctx: BracketContext,
  excludeKey?: string
): ThirdSlotPickState | null {
  if (!match.leftSource.startsWith("3") && !match.rightSource.startsWith("3")) return null;

  const thirdSource = getThirdSideSource(match);
  if (!thirdSource) return null;

  const fixedTeam = getFixedSideTeam(match, ctx);
  const bracketForAssignment = { ...ctx.savedBracket, ...(ctx.pendingBracket ?? {}) };
  const entries = excludeKey
    ? getThirdSlotPickerEntries(match, ctx, excludeKey)
    : getThirdPlaceCandidateEntries(thirdSource, ctx, getAssignedThirdTeamIds(ctx, bracketForAssignment, excludeKey));
  const assignedRivalId = excludeKey ? ctx.thirdSlotAssignments?.[excludeKey] : undefined;
  const thirdPickedTeam =
    assignedRivalId && entries.some((e) => e.team.id === assignedRivalId)
      ? (ctx.allTeams.find((t) => t.id === assignedRivalId) ?? null)
      : pickedTeamId && entries.some((e) => e.team.id === pickedTeamId)
        ? (ctx.allTeams.find((t) => t.id === pickedTeamId) ?? null)
        : null;
  const fixedPicked = !!(pickedTeamId && fixedTeam?.id === pickedTeamId);
  const allowedTeamIds = new Set<string>([
    ...(fixedTeam ? [fixedTeam.id] : []),
    ...entries.map((e) => e.team.id),
  ]);

  return {
    fixedTeam,
    thirdSource,
    entries,
    thirdPickedTeam,
    fixedPicked,
    allowedTeamIds,
  };
}

export function isAllowedThirdSlotPick(
  match: BracketMatch,
  teamId: string,
  ctx: BracketContext,
  excludeKey?: string
): boolean {
  const state = getThirdSlotPickState(match, null, ctx, excludeKey);
  return state?.allowedTeamIds.has(teamId) ?? false;
}

export function getThirdPlaceCandidates(
  source: string,
  ctx: BracketContext,
  excludeTeamIds: Set<string> = new Set()
): BracketTeam[] {
  return getThirdPlaceCandidateEntries(source, ctx, excludeTeamIds).map((e) => e.team);
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
    const pickState = getThirdSlotPickState(match, null, ctx, key);
    if (!pickState) {
      return {
        valid: false,
        error: formatBracketMatchError(match.matchNum, "No se pudo resolver el cruce de terceros."),
      };
    }

    const fixedTeam = pickState.fixedTeam;
    const rivalId = ctx.thirdSlotAssignments?.[key];
    const pickerEntries = getThirdSlotPickerEntries(match, ctx, key);

    if (!fixedTeam) {
      return {
        valid: false,
        error: getBracketMatchIncompleteMessage(match, ctx, key, teamId),
      };
    }

    if (!rivalId || !pickerEntries.some((e) => e.team.id === rivalId)) {
      return {
        valid: false,
        error: getBracketMatchIncompleteMessage(match, { ...ctx, thirdSlotAssignments: ctx.thirdSlotAssignments }, key, teamId),
      };
    }

    if (teamId !== fixedTeam.id && teamId !== rivalId) {
      const rival = ctx.allTeams.find((t) => t.id === rivalId);
      return {
        valid: false,
        error: formatBracketMatchError(
          match.matchNum,
          `Tocá quién pasa: ${fixedTeam.name} o ${rival?.name ?? "el tercero que elegiste"}.`
        ),
      };
    }

    return { valid: true };
  }

  if (!left || !right) {
    return {
      valid: false,
      error: formatBracketMatchError(
        match.matchNum,
        "Faltan equipos en el cruce. Completá la fase de grupos o la ronda anterior."
      ),
    };
  }
  if (teamId !== left.id && teamId !== right.id) {
    return {
      valid: false,
      error: formatBracketMatchError(
        match.matchNum,
        `Solo podés elegir a ${left.name} (${left.code}) o ${right.name} (${right.code}). Tocá uno de esos dos equipos.`
      ),
    };
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

/** Saved pick no longer matches the teams that should play this match */
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
    const pickState = getThirdSlotPickState(match, pickedTeamId, ctx, bracketKey(phase, slot));
    const fixedTeam = pickState?.fixedTeam;
    if (fixedTeam && pickedTeamId === fixedTeam.id) return false;
    if (pickState?.thirdPickedTeam && pickedTeamId === pickState.thirdPickedTeam.id) return false;
    if (pickState?.entries.some((e) => e.team.id === pickedTeamId)) return false;
    return true;
  }

  if (!left || !right) return true;
  return pickedTeamId !== left.id && pickedTeamId !== right.id;
}

/** Whether the user may replace an existing saved winner (stale/invalid picks are always editable) */
export function canReplaceBracketPick(
  phase: string,
  matchSlot: string,
  savedTeamId: string | null | undefined,
  ctx: BracketContext
): boolean {
  if (!savedTeamId) return true;
  return isBracketPickStale(phase, matchSlot, savedTeamId, ctx);
}

/** Teams the user can tap as winner for this match (same logic as validation) */
export function getMatchWinnerOptions(
  match: BracketMatch,
  ctx: BracketContext,
  key: string
): BracketTeam[] {
  if (isThirdSlotMatch(match)) {
    const state = getThirdSlotPickState(match, null, ctx, key);
    const fixed = state?.fixedTeam;
    const rivalId = ctx.thirdSlotAssignments?.[key];
    const options: BracketTeam[] = [];
    if (fixed) options.push(fixed);
    if (rivalId) {
      const rival = ctx.allTeams.find((t) => t.id === rivalId);
      if (rival) options.push(rival);
    }
    return options;
  }
  const { left, right } = resolveMatchTeams(match, ctx);
  return [left, right].filter((t): t is BracketTeam => !!t);
}

/** Human-readable hint listing every valid tap target for this match */
export function formatMatchPickHint(
  match: BracketMatch,
  ctx: BracketContext,
  key: string
): string {
  const completeness = getBracketMatchCompleteness(match, ctx, key);
  if (completeness.step === "pick_rival" && isThirdSlotMatch(match)) {
    const entries = getThirdSlotPickerEntries(match, ctx, key);
    if (entries.length === 0) return "Completá las predicciones de los grupos de este cruce.";
    return `Elegí el tercero rival: ${entries.map((e) => `${e.team.name} (3° ${e.groupLetter})`).join(", ")}.`;
  }
  if (completeness.step === "missing_teams") {
    const missing: string[] = [];
    if (match.leftSource.startsWith("W")) {
      missing.push(`ganador de P${match.leftSource.slice(1)}`);
    }
    if (match.rightSource.startsWith("W")) {
      missing.push(`ganador de P${match.rightSource.slice(1)}`);
    }
    if (missing.length > 0) {
      return `Primero elegí ${missing.join(" y ")} en la ronda anterior.`;
    }
    return "Completá las predicciones de grupos de este cruce.";
  }
  const options = getMatchWinnerOptions(match, ctx, key);
  if (options.length === 0) return "Todavía no hay equipos definidos para este cruce.";
  if (options.length === 1) return `Tocá a ${options[0].name} (${options[0].code}).`;
  return `Tocá a ${options.map((t) => `${t.name} (${t.code})`).join(" o ")}.`;
}

export function getBracketMatchByKey(phase: string, matchSlot: string): BracketMatch | undefined {
  const slot = normalizeMatchSlot(phase, matchSlot);
  return (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === parseInt(slot, 10));
}

export function formatBracketMatchError(matchNum: number, message: string): string {
  return `P${matchNum}: ${message}`;
}

export function validateThirdSlotRival(
  match: BracketMatch,
  teamId: string,
  ctx: BracketContext,
  excludeKey: string
): { valid: boolean; error?: string } {
  const entries = getThirdSlotPickerEntries(match, ctx, excludeKey);
  if (entries.length === 0) {
    return {
      valid: false,
      error: getBracketMatchIncompleteMessage(match, ctx, excludeKey),
    };
  }

  if (!entries.some((e) => e.team.id === teamId)) {
    const names = entries.map((e) => `${e.team.name} (3° ${e.groupLetter})`).join(", ");
    return {
      valid: false,
      error: formatBracketMatchError(
        match.matchNum,
        `Ese tercero no puede jugar este cruce. Opciones válidas: ${names}.`
      ),
    };
  }

  if (getAssignedThirdTeamIds(ctx, { ...ctx.savedBracket, ...(ctx.pendingBracket ?? {}) }, excludeKey).has(teamId)) {
    return {
      valid: false,
      error: formatBracketMatchError(
        match.matchNum,
        `${ctx.allTeams.find((t) => t.id === teamId)?.name ?? "Ese tercero"} ya juega en otro cruce de 16vos.`
      ),
    };
  }

  return { valid: true };
}

/** Fixed seeded side (1X / 2X) in a third-place bracket match */
export function getFixedSideTeam(match: BracketMatch, ctx: BracketContext): BracketTeam | null {
  const fixedSource = match.leftSource.startsWith("3") ? match.rightSource : match.leftSource;
  return resolveSource(fixedSource, ctx);
}

export function validatePendingBracketPicks(
  phase: string,
  pending: Record<string, string>,
  ctx: BracketContext,
  savedBracket: Record<string, string>
): { key: string; matchNum: number; error: string }[] {
  const errors: { key: string; matchNum: number; error: string }[] = [];
  const mergedCtx: BracketContext = {
    ...ctx,
    savedBracket,
    pendingBracket: pending,
  };

  for (const [key, teamId] of Object.entries(pending)) {
    if (!key.startsWith(`${phase}:`)) continue;
    const [p, slot] = key.split(":");
    if (!p || !slot) continue;
    const matchNum = parseInt(normalizeMatchSlot(p, slot), 10);
    const match = (BRACKET_MATCHES[p] ?? []).find((m) => m.matchNum === matchNum);
    if (!match) continue;

    const completeness = getBracketMatchCompleteness(match, mergedCtx, key, teamId);
    if (!completeness.isComplete) {
      errors.push({
        key,
        matchNum,
        error: getBracketMatchIncompleteMessage(match, mergedCtx, key, teamId),
      });
      continue;
    }

    const result = validateBracketPick(p, slot, teamId, mergedCtx);
    if (!result.valid) {
      errors.push({
        key,
        matchNum,
        error: result.error || formatBracketMatchError(matchNum, "Selección inválida."),
      });
    }
  }

  return errors.sort((a, b) => a.matchNum - b.matchNum);
}
