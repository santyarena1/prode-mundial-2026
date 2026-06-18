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

const phaseLabels: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinales",
  FINAL: "Final",
};

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
  const [loadMore, setLoadMore] = useState<LoadMoreStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }

      const [predRes, groupsRes, groupPredRes, bracketPredRes] =
        await Promise.all([
          apiFetch("/api/participant/predictions"),
          fetch("/api/public/groups"),
          apiFetch("/api/participant/group-predictions"),
          apiFetch("/api/participant/bracket-predictions"),
        ]);

      let preds: Prediction[] = [];
      if (predRes.ok) {
        const data = await predRes.json();
        preds = data.predictions || [];
        setPredictions(preds);
      }

      const savedMatchIds = new Set(
        preds
          .filter((p) => p.predictedOutcome)
          .map((p) => p.matchId)
      );

      let totalOpenMatches = 0;
      let groupCount = 0;
      if (groupsRes.ok) {
        const { groups } = await groupsRes.json();
        groupCount = groups?.length ?? 0;
        for (const g of groups || []) {
          for (const m of g.matches || []) {
            if (
              m.status === "scheduled" &&
              isMatchPredictionWindowOpen(m.startDate) &&
              !savedMatchIds.has(m.id)
            ) {
              totalOpenMatches++;
            }
          }
        }
      }

      let lockedGroups = 0;
      if (groupPredRes.ok) {
        const gp = await groupPredRes.json();
        lockedGroups = (gp.groupPredictions || []).filter(
          (p: {
            isLocked: boolean;
            firstTeamId?: string;
            secondTeamId?: string;
          }) => p.isLocked && p.firstTeamId && p.secondTeamId
        ).length;
      }

      let hasBracketProgress = false;
      if (bracketPredRes.ok) {
        const bp = await bracketPredRes.json();
        hasBracketProgress = (bp.bracketPredictions || []).some(
          (p: { isLocked: boolean; predictedTeamId?: string }) =>
            p.isLocked && p.predictedTeamId
        );
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
      </div>

      <Footer />
    </div>
  );
}
