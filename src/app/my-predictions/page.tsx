"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Target,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";
import { isMatchPredictionWindowOpen } from "@/lib/match-utils";

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string | null;
}

interface Match {
  id: string;
  phase: string;
  status: string;
  startDate?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  realOutcome?: string;
  group?: { name: string };
}

interface Prediction {
  id: string;
  matchId: string;
  predictedOutcome?: string | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  status: string;
  pointsEarned: number;
  match: Match;
}

interface GroupPred {
  id: string;
  groupId: string;
  firstTeamId?: string | null;
  secondTeamId?: string | null;
  thirdTeamId?: string | null;
  pointsEarned: number;
  group: { id: string; name: string };
  firstTeam?: Team | null;
  secondTeam?: Team | null;
  thirdTeam?: Team | null;
}

interface GroupData {
  id: string;
  name: string;
  teams: Team[];
  matches: Array<{
    id: string;
    phase: string;
    status: string;
    homeTeam?: Team;
    awayTeam?: Team;
    homeScore?: number | null;
    awayScore?: number | null;
  }>;
}

interface BracketPred {
  id: string;
  phase: string;
  matchSlot: string;
  predictedTeamId?: string | null;
  predictedTeam?: Team | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  pointsEarned: number;
  isLocked: boolean;
}

interface FixtureM {
  matchCode: string;
  status: string;
  startDate?: string | null;
  homeTeam?: Team | null;
  awayTeam?: Team | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerTeamId?: string | null;
}

const phaseLabels: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
  CHAMPION: "Final / Campeón",
};

const BRACKET_PHASE_ORDER = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "CHAMPION"];

const outcomeLabel = (
  outcome: string,
  homeTeam?: Team,
  awayTeam?: Team,
  homePlaceholder?: string,
  awayPlaceholder?: string
) => {
  const home = homeTeam?.name || homePlaceholder || "Local";
  const away = awayTeam?.name || awayPlaceholder || "Visitante";
  if (outcome === "home") return `Gana ${home}`;
  if (outcome === "away") return `Gana ${away}`;
  if (outcome === "draw") return "Empate";
  return outcome;
};

function deriveOutcome(
  home: number | null | undefined,
  away: number | null | undefined,
  fallback?: string | null
) {
  if (home !== null && home !== undefined && away !== null && away !== undefined) {
    if (home > away) return "home";
    if (away > home) return "away";
    return "draw";
  }
  return fallback ?? null;
}

function getPredictionStatus(prediction: Prediction) {
  const match = prediction.match;
  if (match.status === "finished") {
    const effectivePredicted = deriveOutcome(
      prediction.predictedHomeScore,
      prediction.predictedAwayScore,
      prediction.predictedOutcome
    );
    const effectiveReal = deriveOutcome(match.homeScore, match.awayScore, match.realOutcome);
    if (!effectivePredicted) return "locked";
    if (!effectiveReal) return "locked";
    if (effectivePredicted === effectiveReal) return "correct";
    return "wrong";
  }
  if (match.status === "live") return "locked";
  if (!prediction.predictedOutcome) return "pending";
  return "saved";
}

function formatMatchDate(startDate?: string) {
  if (!startDate) return null;
  return new Date(startDate).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LoadMoreStatus {
  canLoadMore: boolean;
  pendingMatches: number;
  pendingGroups: number;
  pendingBracket: boolean;
}

function TeamFlag({ team }: { team?: Team }) {
  if (team?.flagUrl) {
    return (
      <img
        src={team.flagUrl}
        alt={team.name}
        className="w-7 h-[18px] object-cover rounded-sm flex-shrink-0"
      />
    );
  }
  return (
    <span className="text-xs text-gray-600 w-7 text-center flex-shrink-0">
      {team?.code ?? "?"}
    </span>
  );
}

function StatusBanner({
  status,
  pointsEarned,
  matchStartDate,
}: {
  status: string;
  pointsEarned: number;
  matchStartDate?: string;
}) {
  if (status === "correct") {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-green-500/15 border-b border-green-500/25 rounded-t-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
            Acertaste
          </span>
        </div>
        {pointsEarned > 0 && (
          <span className="text-yellow-400 text-xs font-black">
            +{pointsEarned} pts
          </span>
        )}
      </div>
    );
  }

  if (status === "wrong") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 rounded-t-lg">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
          Fallaste
        </span>
      </div>
    );
  }

  if (status === "saved") {
    const dateStr = formatMatchDate(matchStartDate);
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/8 border-b border-blue-500/15 rounded-t-lg">
        <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">
          Guardado
        </span>
        {dateStr && (
          <>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-gray-500 text-xs">{dateStr}</span>
          </>
        )}
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/8 border-b border-orange-500/15 rounded-t-lg">
        <Lock className="w-4 h-4 text-orange-400 flex-shrink-0" />
        <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">
          En juego
        </span>
      </div>
    );
  }

  return null;
}

function PredictionCard({
  pred,
  index,
}: {
  pred: Prediction;
  index: number;
}) {
  const status = getPredictionStatus(pred);
  const match = pred.match;
  const homeName =
    match.homeTeam?.name || match.homePlaceholder || "TBD";
  const awayName =
    match.awayTeam?.name || match.awayPlaceholder || "TBD";
  const isFinished = match.status === "finished";

  const borderColor =
    status === "correct"
      ? "border-green-500/20"
      : status === "wrong"
      ? "border-red-500/20"
      : undefined;

  const hasBanner =
    status === "correct" ||
    status === "wrong" ||
    status === "saved" ||
    status === "locked";

  let predictionText: string | null = null;
  if (pred.predictedOutcome) {
    predictionText = outcomeLabel(
      pred.predictedOutcome,
      match.homeTeam,
      match.awayTeam,
      match.homePlaceholder,
      match.awayPlaceholder
    );
    if (
      pred.predictedHomeScore != null &&
      pred.predictedAwayScore != null
    ) {
      predictionText += ` · Marcador: ${pred.predictedHomeScore}-${pred.predictedAwayScore}`;
    }
  }

  return (
    <motion.div
      key={pred.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`overflow-hidden p-0 ${borderColor ?? ""}`}>
        {hasBanner && (
          <StatusBanner
            status={status}
            pointsEarned={pred.pointsEarned}
            matchStartDate={match.startDate}
          />
        )}

        <div className="px-4 py-3">
          {/* Teams row */}
          <div className="flex items-center justify-center gap-3">
            {/* Home */}
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              <span className="text-white font-semibold text-sm text-right truncate">
                {homeName}
              </span>
              <TeamFlag team={match.homeTeam} />
            </div>

            {/* Score or VS */}
            <div className="flex-shrink-0 w-16 text-center">
              {isFinished &&
              match.homeScore != null &&
              match.awayScore != null ? (
                <span className="font-black text-white text-lg tabular-nums">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-gray-600 text-xs font-bold">VS</span>
              )}
            </div>

            {/* Away */}
            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
              <TeamFlag team={match.awayTeam} />
              <span className="text-white font-semibold text-sm text-left truncate">
                {awayName}
              </span>
            </div>
          </div>

          {/* Footer row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {predictionText && (
              <span className="text-gray-500 text-xs">
                Tu predicción:{" "}
                <span className="text-gray-400">{predictionText}</span>
              </span>
            )}
            {match.group && (
              <span className="text-gray-700 text-xs">
                ══ Grupo {match.group.name}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function MyPredictionsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [groupPredictions, setGroupPredictions] = useState<GroupPred[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [bracketPreds, setBracketPreds] = useState<BracketPred[]>([]);
  const [fixtureByCode, setFixtureByCode] = useState<Record<string, FixtureM>>({});
  const [loadMore, setLoadMore] = useState<LoadMoreStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }

      const [predRes, groupsRes, groupPredRes, bracketPredRes, fixtureRes] =
        await Promise.all([
          apiFetch("/api/participant/predictions"),
          fetch("/api/public/groups"),
          apiFetch("/api/participant/group-predictions"),
          apiFetch("/api/participant/bracket-predictions"),
          fetch("/api/public/fixture"),
        ]);

      if (fixtureRes.ok) {
        const fx = await fixtureRes.json();
        const byCode: Record<string, FixtureM> = {};
        for (const block of fx.fixture || []) {
          if (block.phase === "GROUP_STAGE") continue;
          for (const m of block.matches || []) byCode[m.matchCode] = m;
        }
        setFixtureByCode(byCode);
      }

      let preds: Prediction[] = [];
      if (predRes.ok) {
        const data = await predRes.json();
        preds = data.predictions || [];
        setPredictions(preds);
      }

      let parsedGroupPreds: GroupPred[] = [];
      if (groupPredRes.ok) {
        const gp = await groupPredRes.json();
        parsedGroupPreds = gp.groupPredictions || [];
        setGroupPredictions(parsedGroupPreds);
      }

      let fetchedGroups: GroupData[] = [];
      if (groupsRes.ok) {
        const { groups: g } = await groupsRes.json();
        fetchedGroups = g || [];
        setGroups(fetchedGroups);
      }

      const savedMatchIds = new Set(
        preds
          .filter((p) => p.predictedOutcome)
          .map((p) => p.matchId)
      );

      let totalOpenMatches = 0;
      const groupCount = fetchedGroups.length;
      for (const g of fetchedGroups) {
        for (const m of g.matches || []) {
          if (
            m.status === "scheduled" &&
            isMatchPredictionWindowOpen((m as Match).startDate) &&
            !savedMatchIds.has(m.id)
          ) {
            totalOpenMatches++;
          }
        }
      }

      const lockedGroups = parsedGroupPreds.filter(
        (p) => p.firstTeamId && p.secondTeamId
      ).length;

      let hasBracketProgress = false;
      if (bracketPredRes.ok) {
        const bp = await bracketPredRes.json();
        const list: BracketPred[] = bp.bracketPredictions || [];
        setBracketPreds(list.filter((p) => p.predictedTeamId));
        hasBracketProgress = list.some((p) => p.isLocked && p.predictedTeamId);
      }

      const pendingGroups = Math.max(0, groupCount - lockedGroups);
      const pendingBracket = !hasBracketProgress;
      const canLoadMore =
        totalOpenMatches > 0 || pendingGroups > 0 || pendingBracket;

      setLoadMore({
        canLoadMore,
        pendingMatches: totalOpenMatches,
        pendingGroups,
        pendingBracket,
      });

      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <LoadingScreen text="Cargando predicciones..." />;

  const byPhase: Record<string, Prediction[]> = {};
  for (const pred of predictions) {
    const phase = pred.match.phase;
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(pred);
  }

  const totalPoints = predictions.reduce(
    (sum, p) => sum + (p.pointsEarned || 0),
    0
  );
  const correct = predictions.filter(
    (p) => getPredictionStatus(p) === "correct"
  ).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black uppercase text-white">
            Mis <span className="text-red-500">Predicciones</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Historial de tus predicciones guardadas
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-black text-white">
              {predictions.length}
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider">
              Total
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="text-2xl font-black text-green-400">
                {correct}
              </div>
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider">
              Correctas
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div className="text-2xl font-black text-yellow-400">
                {totalPoints}
              </div>
            </div>
            <div className="text-gray-500 text-xs uppercase tracking-wider">
              Puntos
            </div>
          </Card>
        </div>

        {loadMore?.canLoadMore && (
          <Card className="p-5 mb-8 border-red-600/25 bg-red-600/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm mb-1">
                  Todavía podés cargar más
                </p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  {loadMore.pendingMatches > 0 && (
                    <span>
                      {loadMore.pendingMatches} partido
                      {loadMore.pendingMatches !== 1 ? "s" : ""} sin predecir
                    </span>
                  )}
                  {loadMore.pendingMatches > 0 &&
                    loadMore.pendingGroups > 0 &&
                    " · "}
                  {loadMore.pendingGroups > 0 && (
                    <span>
                      {loadMore.pendingGroups} grupo
                      {loadMore.pendingGroups !== 1 ? "s" : ""} sin
                      clasificados
                    </span>
                  )}
                  {(loadMore.pendingMatches > 0 ||
                    loadMore.pendingGroups > 0) &&
                    loadMore.pendingBracket &&
                    " · "}
                  {loadMore.pendingBracket && (
                    <span>eliminatorias o campeón pendientes</span>
                  )}
                </p>
              </div>
              <Link href="/predictions">
                <Button
                  variant="primary"
                  size="md"
                  className="whitespace-nowrap"
                >
                  <Target className="w-4 h-4" />
                  Ir a cargar más
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {predictions.length === 0 && (
          <Card className="p-10 text-center">
            <Clock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              Todavía no cargaste predicciones.
            </p>
            <Link href="/predictions">
              <Button variant="primary" size="md">
                Ir a cargar predicciones
              </Button>
            </Link>
          </Card>
        )}

        {Object.entries(byPhase).map(([phase, preds]) => (
          <div key={phase} className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
              {phaseLabels[phase] || phase}
            </h2>
            <div className="space-y-3">
              {preds.map((pred, i) => (
                <PredictionCard key={pred.id} pred={pred} index={i} />
              ))}
            </div>
          </div>
        ))}

        {/* ── Posiciones de grupos ── */}
        {groupPredictions.length > 0 && (() => {
          const groupMap = new Map(groups.map(g => [g.id, g]));
          const groupPtsTotal = groupPredictions.reduce((s, gp) => s + gp.pointsEarned, 0);
          const finishedGroups = groupPredictions.filter(gp => {
            const g = groupMap.get(gp.groupId);
            if (!g) return false;
            const gMatches = g.matches.filter(m => m.phase === "GROUP_STAGE");
            return gMatches.length > 0 && gMatches.every(m => m.status === "finished");
          });
          if (finishedGroups.length === 0) return null;

          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400">
                  Clasificados de grupos
                </h2>
                {groupPtsTotal > 0 && (
                  <span className="text-xs font-black text-yellow-400">+{groupPtsTotal.toLocaleString("es-AR")} pts totales</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {finishedGroups.map(gp => {
                  const g = groupMap.get(gp.groupId);
                  if (!g) return null;
                  const gMatches = g.matches.filter(m => m.phase === "GROUP_STAGE");

                  // Compute real standings from actual scores
                  const rStats: Record<string, { pts: number; gd: number; gf: number }> = {};
                  for (const t of g.teams) rStats[t.id] = { pts: 0, gd: 0, gf: 0 };
                  for (const m of gMatches) {
                    const hId = m.homeTeam?.id, aId = m.awayTeam?.id;
                    if (!hId || !aId || m.homeScore == null || m.awayScore == null) continue;
                    if (!rStats[hId]) rStats[hId] = { pts: 0, gd: 0, gf: 0 };
                    if (!rStats[aId]) rStats[aId] = { pts: 0, gd: 0, gf: 0 };
                    const h = m.homeScore, a = m.awayScore;
                    if (h > a) rStats[hId].pts += 3;
                    else if (a > h) rStats[aId].pts += 3;
                    else { rStats[hId].pts += 1; rStats[aId].pts += 1; }
                    rStats[hId].gd += h - a; rStats[aId].gd += a - h;
                    rStats[hId].gf += h; rStats[aId].gf += a;
                  }
                  const rSorted = Object.entries(rStats).sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                  const realFirst = rSorted[0]?.[0];
                  const realSecond = rSorted[1]?.[0];
                  const teamById = new Map(g.teams.map(t => [t.id, t]));

                  // Compute predicted standings from match predictions (same as scoring engine)
                  const predStats: Record<string, { pts: number; gd: number; gf: number }> = {};
                  for (const t of g.teams) predStats[t.id] = { pts: 0, gd: 0, gf: 0 };
                  const predByMatchId = new Map(predictions.map(p => [p.matchId, p]));
                  for (const m of gMatches) {
                    if (!m.homeTeam?.id || !m.awayTeam?.id) continue;
                    const pred = predByMatchId.get(m.id);
                    if (!pred?.predictedOutcome) continue;
                    const hId = m.homeTeam.id, aId = m.awayTeam.id;
                    if (!predStats[hId]) predStats[hId] = { pts: 0, gd: 0, gf: 0 };
                    if (!predStats[aId]) predStats[aId] = { pts: 0, gd: 0, gf: 0 };
                    if (pred.predictedOutcome === "home") predStats[hId].pts += 3;
                    else if (pred.predictedOutcome === "away") predStats[aId].pts += 3;
                    else { predStats[hId].pts += 1; predStats[aId].pts += 1; }
                    if (pred.predictedHomeScore != null && pred.predictedAwayScore != null) {
                      predStats[hId].gd += pred.predictedHomeScore - pred.predictedAwayScore;
                      predStats[aId].gd += pred.predictedAwayScore - pred.predictedHomeScore;
                      predStats[hId].gf += pred.predictedHomeScore;
                      predStats[aId].gf += pred.predictedAwayScore;
                    }
                  }
                  const predSorted = Object.entries(predStats).sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
                  const predFirst  = predSorted[0]?.[0] ?? null;
                  const predSecond = predSorted[1]?.[0] ?? null;

                  type GPRow = { pos: string; team: Team | null | undefined; label: string; pts: number; ok: boolean };
                  const rows: GPRow[] = [];
                  if (predFirst) {
                    const t = teamById.get(predFirst);
                    if (predFirst === realFirst) rows.push({ pos: "1°", team: t, label: "exacto", pts: 2000, ok: true });
                    else if (predFirst === realSecond) rows.push({ pos: "1°", team: t, label: "clasificó (no exacto)", pts: 1500, ok: true });
                    else rows.push({ pos: "1°", team: t, label: "no clasificó", pts: 0, ok: false });
                  }
                  if (predSecond) {
                    const t = teamById.get(predSecond);
                    if (predSecond === realSecond) rows.push({ pos: "2°", team: t, label: "exacto", pts: 2000, ok: true });
                    else if (predSecond === realFirst) rows.push({ pos: "2°", team: t, label: "clasificó (no exacto)", pts: 1500, ok: true });
                    else rows.push({ pos: "2°", team: t, label: "no clasificó", pts: 0, ok: false });
                  }

                  const allOk = rows.every(r => r.ok);
                  const anyOk = rows.some(r => r.ok);

                  return (
                    <Card key={gp.id} className={`p-0 overflow-hidden ${allOk ? "border-green-500/20" : anyOk ? "border-yellow-500/15" : "border-red-500/10"}`}>
                      <div className={`px-4 py-2.5 flex items-center justify-between ${allOk ? "bg-green-500/10" : anyOk ? "bg-yellow-500/5" : "bg-red-500/5"}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {gp.group.name}
                          </span>
                          <span className="text-white text-sm font-bold">Grupo {gp.group.name}</span>
                        </div>
                        {gp.pointsEarned > 0
                          ? <span className="text-yellow-400 text-xs font-black">+{gp.pointsEarned.toLocaleString("es-AR")} pts</span>
                          : <span className="text-gray-700 text-xs">0 pts</span>
                        }
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {rows.map(row => (
                          <div key={row.pos} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-600 w-5 flex-shrink-0">{row.pos}</span>
                            {row.team?.flagUrl && (
                              <img src={row.team.flagUrl} alt="" className="w-5 h-[13px] object-cover rounded flex-shrink-0" />
                            )}
                            <span className={`text-xs font-semibold flex-1 ${row.ok ? "text-white" : "text-gray-600"}`}>
                              {row.team?.name ?? "?"}
                            </span>
                            {row.ok ? (
                              <span className="text-green-400 text-[10px] font-bold">✓ {row.label}{row.pts > 0 ? ` · +${row.pts.toLocaleString("es-AR")}` : ""}</span>
                            ) : (
                              <span className="text-red-500 text-[10px]">✗ {row.label}</span>
                            )}
                          </div>
                        ))}
                        <div className="pt-1.5 border-t border-[#1a1a1a] text-[10px] text-gray-700">
                          Real: 1° {teamById.get(realFirst ?? "")?.name ?? "?"} · 2° {teamById.get(realSecond ?? "")?.name ?? "?"}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Eliminatorias (16vos en adelante) ─────────────────────────── */}
        {bracketPreds.length > 0 && (() => {
          const bracketPtsTotal = bracketPreds.reduce((s, p) => s + (p.pointsEarned || 0), 0);
          return (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase text-white tracking-tight">Eliminatorias</h2>
                <span className="text-yellow-400 font-black text-sm">
                  {bracketPtsTotal.toLocaleString("es-AR")} pts
                </span>
              </div>
              <div className="space-y-6">
                {BRACKET_PHASE_ORDER.map((phase) => {
                  const picks = bracketPreds.filter((p) => p.phase === phase);
                  if (picks.length === 0) return null;
                  return (
                    <div key={phase}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500">
                          {phaseLabels[phase] ?? phase}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/20 to-transparent" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {picks.map((p) => {
                          const real = fixtureByCode[p.matchSlot];
                          const finished = real?.status === "finished";
                          const pick = p.predictedTeam;
                          const won = finished && real?.winnerTeamId === p.predictedTeamId;
                          return (
                            <Card key={p.id} className="p-3">
                              {real ? (
                                <>
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className={`font-bold truncate ${real.winnerTeamId === real.homeTeam?.id ? "text-white" : "text-gray-500"}`}>
                                      {real.homeTeam?.name ?? "?"}
                                    </span>
                                    <span className="font-black text-white tabular-nums shrink-0">
                                      {finished ? `${real.homeScore ?? 0} - ${real.awayScore ?? 0}` : "vs"}
                                    </span>
                                    <span className={`font-bold truncate text-right ${real.winnerTeamId === real.awayTeam?.id ? "text-white" : "text-gray-500"}`}>
                                      {real.awayTeam?.name ?? "?"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1a1a1a]">
                                    <span className="text-[11px] text-gray-400">
                                      Tu elección: <span className="text-yellow-300 font-bold">{pick?.name ?? "?"}</span>
                                    </span>
                                    {finished ? (
                                      p.pointsEarned > 0
                                        ? <span className="text-green-400 text-[11px] font-black">✓ +{p.pointsEarned.toLocaleString("es-AR")}</span>
                                        : <span className="text-red-500 text-[11px] font-bold">{won ? "✓" : "✗"}</span>
                                    ) : (
                                      <span className="text-gray-600 text-[10px]">Pendiente</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-400">
                                    Pasa: <span className="text-yellow-300 font-bold">{pick?.name ?? "?"}</span>
                                  </span>
                                  {p.pointsEarned > 0
                                    ? <span className="text-green-400 text-[11px] font-black">+{p.pointsEarned.toLocaleString("es-AR")}</span>
                                    : <span className="text-gray-600 text-[10px]">Pendiente</span>}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <Footer />
    </div>
  );
}
