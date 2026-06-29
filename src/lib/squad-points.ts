import prisma from "./db";
import { DEFAULT_POINT_RULES } from "./points";

const RULE_KEYS = Object.keys(DEFAULT_POINT_RULES) as (keyof typeof DEFAULT_POINT_RULES)[];

export async function getSquadPointRules(squadId: string): Promise<Record<string, number>> {
  const rules = await prisma.squadPointRule.findMany({ where: { squadId } });
  const base = Object.fromEntries(
    RULE_KEYS.map((k) => [k, DEFAULT_POINT_RULES[k].points])
  );
  for (const r of rules) base[r.key] = r.points;
  return base;
}

function groupQualifiers(
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
  const sorted = Object.entries(stats).sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return { first: sorted[0]?.[0] ?? null, second: sorted[1]?.[0] ?? null, third: sorted[2]?.[0] ?? null };
}

export async function calculateSquadMemberPoints(memberId: string): Promise<number> {
  const member = await prisma.squadMember.findUnique({
    where: { id: memberId },
    include: { squad: true },
  });
  if (!member) return 0;

  const rules = await getSquadPointRules(member.squadId);

  // ── Match predictions ────────────────────────────────────────────────────
  const matchPreds = await prisma.squadPrediction.findMany({
    where: { memberId },
    include: {
      match: {
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });

  let total = 0;

  for (const pred of matchPreds) {
    const m = pred.match;
    if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) continue;
    if (pred.predictedHomeScore == null || pred.predictedAwayScore == null) continue;

    const actualOutcome = m.homeScore > m.awayScore ? "home" : m.awayScore > m.homeScore ? "away" : "draw";
    const ph = pred.predictedHomeScore, pa = pred.predictedAwayScore;
    const predOutcome = ph > pa ? "home" : pa > ph ? "away" : "draw";

    let pts = 0;
    if (predOutcome === actualOutcome) {
      pts += rules.GROUP_SIGN ?? 150;
      if (actualOutcome === "draw") pts += rules.GROUP_DRAW_BONUS ?? 100;
      if (member.squad.isHardcore && ph === m.homeScore && pa === m.awayScore) {
        pts += rules.EXACT_SCORE ?? 150;
      }
    }

    if (pred.pointsEarned !== pts) {
      await prisma.squadPrediction.update({ where: { id: pred.id }, data: { pointsEarned: pts } });
    }
    total += pts;
  }

  // ── Group classification predictions ────────────────────────────────────
  const groupPreds = await prisma.squadGroupPrediction.findMany({
    where: { memberId },
    include: {
      wcGroup: {
        include: {
          teams: true,
          matches: true,
        },
      },
    },
  });

  for (const gp of groupPreds) {
    const actual = groupQualifiers(gp.wcGroup.teams, gp.wcGroup.matches);
    let pts = 0;

    const predFirst = gp.firstTeamId;
    const predSecond = gp.secondTeamId;
    const actualFirst = actual.first;
    const actualSecond = actual.second;

    const predClassified = [predFirst, predSecond].filter(Boolean) as string[];
    const actualClassified = [actualFirst, actualSecond].filter(Boolean) as string[];

    for (const t of predClassified) {
      if (actualClassified.includes(t)) pts += rules.GROUP_CLASSIFIED ?? 400;
    }
    if (predFirst && predFirst === actualFirst) pts += rules.GROUP_POSITION ?? 600;
    if (predSecond && predSecond === actualSecond) pts += rules.GROUP_POSITION ?? 600;
    if (gp.thirdTeamId && actual.third && gp.thirdTeamId === actual.third) {
      pts += rules.GROUP_THIRD_QUALIFIED ?? 250;
    }

    if (gp.pointsEarned !== pts) {
      await prisma.squadGroupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: pts } });
    }
    total += pts;
  }

  // ── Bracket predictions ─────────────────────────────────────────────────
  const bracketPreds = await prisma.squadBracketPrediction.findMany({ where: { memberId } });
  const phaseRuleMap: Record<string, keyof typeof DEFAULT_POINT_RULES> = {
    ROUND_OF_32: "ROUND_OF_32",
    ROUND_OF_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINALS",
    SEMI_FINALS: "SEMI_FINALS",
    CHAMPION: "CHAMPION",
  };

  const allMatches = await prisma.match.findMany({
    where: { phase: { in: Object.keys(phaseRuleMap) }, status: "finished" },
    include: { homeTeam: true, awayTeam: true },
  });

  const winnersByPhase: Record<string, Set<string>> = {};
  for (const m of allMatches) {
    if (!winnersByPhase[m.phase]) winnersByPhase[m.phase] = new Set();
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore == null || m.awayScore == null) continue;
    const winner = m.homeScore > m.awayScore ? m.homeTeamId : m.awayScore > m.homeScore ? m.awayTeamId : null;
    if (winner) winnersByPhase[m.phase].add(winner);
  }

  for (const bp of bracketPreds) {
    if (!bp.predictedTeamId) continue;
    const ruleKey = phaseRuleMap[bp.phase];
    if (!ruleKey) continue;

    let pts = 0;
    const winners = winnersByPhase[bp.phase];
    if (winners?.has(bp.predictedTeamId)) {
      pts = rules[ruleKey] ?? 0;
    }

    if (bp.pointsEarned !== pts) {
      await prisma.squadBracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: pts } });
    }
    total += pts;
  }

  await prisma.squadMember.update({ where: { id: memberId }, data: { totalPoints: total } });
  return total;
}

export async function calculateAllSquadMembers(squadId: string): Promise<void> {
  const members = await prisma.squadMember.findMany({ where: { squadId } });
  await Promise.all(members.map((m) => calculateSquadMemberPoints(m.id)));
}
