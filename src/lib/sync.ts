import prisma from "./db";
import { getProvider } from "@/services/football-providers";
import { ApiFootballProvider } from "@/services/football-providers/api-football";

async function log(
  provider: string,
  action: string,
  status: "ok" | "error" | "skipped",
  message: string,
  counts: { requestCount?: number; updatedMatches?: number } = {}
) {
  await prisma.syncLog.create({
    data: {
      provider,
      action,
      status,
      message,
      requestCount: counts.requestCount ?? 1,
      updatedMatches: counts.updatedMatches ?? 0,
    },
  });
}

// ─── Teams + Groups (from standings — authoritative group assignments) ─────────

export async function syncTeams(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") {
    await log("manual", "teams", "skipped", "Manual mode");
    return { success: false, message: "Manual mode — manage teams from admin panel", count: 0 };
  }
  try {
    const raw = getProvider();
    if (!(raw instanceof ApiFootballProvider)) {
      return { success: false, message: "Provider does not support getTeamsWithGroups", count: 0 };
    }

    const { teams, teamGroups } = await raw.getTeamsWithGroups();

    // Ensure all 12 groups exist and collect their IDs
    const groupIds: Record<string, string> = {};
    const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    for (const letter of groupLetters) {
      const g = await prisma.worldCupGroup.upsert({
        where: { name: letter },
        update: {},
        create: { name: letter },
      });
      groupIds[letter] = g.id;
    }

    let count = 0;
    for (const t of teams) {
      const groupLetter = teamGroups[t.externalId];
      const groupId = groupLetter ? (groupIds[groupLetter] ?? null) : null;
      const flagUrl = t.flagUrl || "";

      // Try matching by externalId first (most reliable)
      const byExtId = await prisma.team.findFirst({ where: { externalId: t.externalId } });
      if (byExtId) {
        await prisma.team.update({
          where: { id: byExtId.id },
          data: { name: t.name, flagUrl, groupId, externalId: t.externalId },
        });
      } else {
        // Fall back to code match, then create new
        // Check if code is already taken by a different team
        const byCode = await prisma.team.findUnique({ where: { code: t.code } });
        if (byCode && byCode.externalId !== t.externalId) {
          // Real collision — use externalId as code to guarantee uniqueness
          const safeCode = `X${t.externalId}`;
          await prisma.team.upsert({
            where: { code: safeCode },
            update: { name: t.name, flagUrl, groupId, externalId: t.externalId },
            create: { name: t.name, code: safeCode, flagUrl, groupId, externalId: t.externalId },
          });
        } else {
          await prisma.team.upsert({
            where: { code: t.code },
            update: { name: t.name, flagUrl, groupId, externalId: t.externalId },
            create: { name: t.name, code: t.code, flagUrl, groupId, externalId: t.externalId },
          });
        }
      }
      count++;
    }

    await log(providerName, "teams", "ok", `Synced ${count} teams with groups`, { requestCount: 1, updatedMatches: count });
    return { success: true, message: `Synced ${count} teams with groups`, count };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "teams", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export async function syncFixtures(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") {
    await log("manual", "fixtures", "skipped", "Manual mode");
    return { success: false, message: "Manual mode — import fixture from CSV or create manually", count: 0 };
  }
  try {
    const provider = getProvider();
    const fixtures = await provider.getFixtures();
    let count = 0;

    // Remove seed/manual matches (no externalId) that have no user predictions.
    // This prevents duplicate fixtures when switching from hardcoded seed to real API data.
    const seedMatchIds = await prisma.match.findMany({
      where: { externalId: null },
      select: { id: true, predictions: { select: { id: true }, take: 1 } },
    });
    const safeToDelete = seedMatchIds.filter((m) => m.predictions.length === 0).map((m) => m.id);
    if (safeToDelete.length > 0) {
      await prisma.matchEvent.deleteMany({ where: { matchId: { in: safeToDelete } } });
      await prisma.match.deleteMany({ where: { id: { in: safeToDelete } } });
    }

    for (const f of fixtures) {
      // Resolve teams by externalId
      const homeTeam = f.homeTeamExternalId
        ? await prisma.team.findFirst({ where: { externalId: f.homeTeamExternalId } })
        : null;
      const awayTeam = f.awayTeamExternalId
        ? await prisma.team.findFirst({ where: { externalId: f.awayTeamExternalId } })
        : null;

      // Group comes from the team's assigned group (set during syncTeams)
      const groupId = homeTeam?.groupId ?? awayTeam?.groupId ?? null;

      await prisma.match.upsert({
        where: { matchCode: f.matchCode },
        update: {
          externalId: f.externalId,
          provider: providerName,
          phase: f.phase,
          groupId,
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          homePlaceholder: !homeTeam ? (f.homeName ?? null) : null,
          awayPlaceholder: !awayTeam ? (f.awayName ?? null) : null,
          venue: f.venue ?? null,
          startDate: f.startDate ?? null,
          status: f.status,
          lastSyncedAt: new Date(),
        },
        create: {
          externalId: f.externalId,
          provider: providerName,
          matchCode: f.matchCode,
          phase: f.phase,
          groupId,
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          homePlaceholder: !homeTeam ? (f.homeName ?? null) : null,
          awayPlaceholder: !awayTeam ? (f.awayName ?? null) : null,
          venue: f.venue ?? null,
          startDate: f.startDate ?? null,
          status: f.status,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    await log(providerName, "fixtures", "ok", `Synced ${count} fixtures`, { requestCount: 1, updatedMatches: count });
    return { success: true, message: `Synced ${count} fixtures`, count };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "fixtures", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function syncResults(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") {
    await log("manual", "results", "skipped", "Manual mode");
    return { success: false, message: "Manual mode — enter results from admin panel", count: 0 };
  }
  try {
    const provider = getProvider();
    const pending = await prisma.match.findMany({
      where: { status: { not: "finished" }, externalId: { not: null } },
    });
    let count = 0;
    const errors: string[] = [];

    for (const match of pending) {
      try {
        const result = await provider.getMatchResult(match.externalId!);
        if (!result) continue;

        let winnerTeamId: string | null = null;
        if (result.winnerTeamExternalId) {
          const winner = await prisma.team.findFirst({ where: { externalId: result.winnerTeamExternalId } });
          winnerTeamId = winner?.id ?? null;
        }

        const homeScore = result.homeScore ?? null;
        const awayScore = result.awayScore ?? null;
        const realOutcome =
          result.status === "finished" && homeScore !== null && awayScore !== null
            ? homeScore > awayScore ? "HOME_WIN" : awayScore > homeScore ? "AWAY_WIN" : "DRAW"
            : null;

        await prisma.match.update({
          where: { id: match.id },
          data: { homeScore, awayScore, realOutcome, winnerTeamId, status: result.status, lastSyncedAt: new Date() },
        });
        count++;
      } catch (e: any) {
        errors.push(`${match.matchCode}: ${e.message}`);
      }
    }

    const status = count === 0 && errors.length > 0 ? "error" : "ok";
    const message = `Updated ${count} matches${errors.length ? `, ${errors.length} errors` : ""}`;
    await log(providerName, "results", status, message, { requestCount: pending.length, updatedMatches: count });
    return { success: true, message, count };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "results", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Live matches ─────────────────────────────────────────────────────────────

export async function syncLive(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") return { success: false, message: "Manual mode", count: 0 };

  try {
    const raw = getProvider();
    if (!(raw instanceof ApiFootballProvider)) return { success: false, message: "Provider not supported", count: 0 };

    const liveMatches = await raw.getLiveMatches();
    if (liveMatches.length === 0) {
      return { success: true, message: "No live matches", count: 0 };
    }

    let count = 0;
    for (const result of liveMatches) {
      const match = await prisma.match.findFirst({ where: { externalId: result.externalId } });
      if (!match) continue;

      const homeScore = result.homeScore ?? null;
      const awayScore = result.awayScore ?? null;
      await prisma.match.update({
        where: { id: match.id },
        data: { homeScore, awayScore, status: result.status, lastSyncedAt: new Date() },
      });
      count++;
    }

    await log(providerName, "live", "ok", `Updated ${count} live matches`, { requestCount: 1, updatedMatches: count });
    return { success: true, message: `Updated ${count} live matches`, count };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "live", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function syncStandings(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") return { success: false, message: "Manual mode", count: 0 };

  try {
    const raw = getProvider();
    if (!(raw instanceof ApiFootballProvider)) return { success: false, message: "Provider not supported", count: 0 };

    const standings = await raw.getStandings();
    const season = process.env.FOOTBALL_SEASON || "2026";

    for (const s of standings) {
      await (prisma as any).standing.upsert({
        where: { season_group_teamExternalId: { season, group: s.group, teamExternalId: s.teamExternalId } },
        update: {
          teamName: s.teamName,
          teamLogo: s.teamLogo,
          rank: s.rank,
          points: s.points,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalsDiff: s.goalsDiff,
          form: s.form,
        },
        create: {
          season,
          group: s.group,
          teamExternalId: s.teamExternalId,
          teamName: s.teamName,
          teamLogo: s.teamLogo,
          rank: s.rank,
          points: s.points,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalsDiff: s.goalsDiff,
          form: s.form,
        },
      });
    }

    await log(providerName, "standings", "ok", `Synced ${standings.length} standing entries`, { requestCount: 1, updatedMatches: standings.length });
    return { success: true, message: `Synced ${standings.length} entries`, count: standings.length };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "standings", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Top scorers ──────────────────────────────────────────────────────────────

export async function syncTopScorers(): Promise<{ success: boolean; message: string; count: number }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  if (providerName === "manual") return { success: false, message: "Manual mode", count: 0 };

  try {
    const raw = getProvider();
    if (!(raw instanceof ApiFootballProvider)) return { success: false, message: "Provider not supported", count: 0 };

    const scorers = await raw.getTopScorers();
    const season = process.env.FOOTBALL_SEASON || "2026";

    for (const s of scorers) {
      await (prisma as any).topScorer.upsert({
        where: { season_externalId: { season, externalId: s.externalId } },
        update: {
          rank: s.rank,
          name: s.name,
          photo: s.photo,
          teamName: s.teamName,
          teamLogo: s.teamLogo,
          goals: s.goals,
          assists: s.assists,
          gamesPlayed: s.gamesPlayed,
          minutesPlayed: s.minutesPlayed,
        },
        create: {
          season,
          externalId: s.externalId,
          rank: s.rank,
          name: s.name,
          photo: s.photo,
          teamName: s.teamName,
          teamLogo: s.teamLogo,
          goals: s.goals,
          assists: s.assists,
          gamesPlayed: s.gamesPlayed,
          minutesPlayed: s.minutesPlayed,
        },
      });
    }

    await log(providerName, "topscorers", "ok", `Synced ${scorers.length} scorers`, { requestCount: 1, updatedMatches: scorers.length });
    return { success: true, message: `Synced ${scorers.length} scorers`, count: scorers.length };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, "topscorers", "error", msg);
    return { success: false, message: msg, count: 0 };
  }
}

// ─── Match events (goals, cards) ──────────────────────────────────────────────

export async function syncMatchEvents(matchId: string): Promise<{ success: boolean; message: string }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.externalId) return { success: false, message: "Match not found or no externalId" };

  try {
    const raw = getProvider();
    if (!(raw instanceof ApiFootballProvider)) return { success: false, message: "Provider not supported" };

    const events = await raw.getMatchEvents(match.externalId);

    // Delete old events and re-insert
    await (prisma as any).matchEvent.deleteMany({ where: { matchId } });

    for (const e of events) {
      const team = e.teamExternalId
        ? await prisma.team.findFirst({ where: { externalId: e.teamExternalId } })
        : null;

      await (prisma as any).matchEvent.create({
        data: {
          matchId,
          minute: e.minute,
          extraTime: e.extraTime,
          teamId: team?.id ?? null,
          teamName: e.teamName,
          playerName: e.playerName,
          assistName: e.assistName,
          eventType: e.eventType,
          detail: e.detail,
          comments: e.comments,
        },
      });
    }

    await log(providerName, `events:${match.matchCode}`, "ok", `Synced ${events.length} events`, { requestCount: 1 });
    return { success: true, message: `Synced ${events.length} events` };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, `events:${match.matchCode ?? matchId}`, "error", msg);
    return { success: false, message: msg };
  }
}

// ─── Single match result ──────────────────────────────────────────────────────

export async function syncMatch(matchId: string): Promise<{ success: boolean; message: string }> {
  const providerName = process.env.FOOTBALL_PROVIDER || "manual";
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { success: false, message: "Match not found" };
  if (!match.externalId) return { success: false, message: "Match has no externalId" };
  if (providerName === "manual") return { success: false, message: "Manual mode" };

  try {
    const provider = getProvider();
    const result = await provider.getMatchResult(match.externalId);
    if (!result) return { success: false, message: "No data from provider" };

    let winnerTeamId: string | null = null;
    if (result.winnerTeamExternalId) {
      const winner = await prisma.team.findFirst({ where: { externalId: result.winnerTeamExternalId } });
      winnerTeamId = winner?.id ?? null;
    }

    const homeScore = result.homeScore ?? null;
    const awayScore = result.awayScore ?? null;
    const realOutcome =
      result.status === "finished" && homeScore !== null && awayScore !== null
        ? homeScore > awayScore ? "HOME_WIN" : awayScore > homeScore ? "AWAY_WIN" : "DRAW"
        : null;

    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore, awayScore, realOutcome, winnerTeamId, status: result.status, lastSyncedAt: new Date() },
    });

    await log(providerName, `match:${match.matchCode}`, "ok", "Updated", { updatedMatches: 1 });
    return { success: true, message: `Match ${match.matchCode} updated` };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    await log(providerName, `match:${match.matchCode}`, "error", msg);
    return { success: false, message: msg };
  }
}

// Legacy wrapper
export async function syncFromProvider(_provider: string, action: string): Promise<{ success: boolean; message: string }> {
  if (action === "fixtures") return syncFixtures();
  if (action === "results") return syncResults();
  if (action === "teams") return syncTeams();
  return { success: false, message: `Unknown action: ${action}` };
}
