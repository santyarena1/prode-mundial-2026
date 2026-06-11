"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, CheckCircle2, ChevronDown, ChevronUp,
  Trophy, Target, Users, AlertTriangle, X, Save, Gift, Search, Zap, Flame,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { GuidedTour } from "@/components/ui/GuidedTour";
import { apiFetch } from "@/lib/api";

const PREDICTIONS_TOUR = [
  { icon: "⚽", title: "Predecí los partidos", desc: "En la pestaña 'Partidos' elegís el resultado de cada partido de la fase de grupos: local, visitante o empate. Tenés hasta que el partido empiece." },
  { icon: "🏅", title: "Tabla proyectada", desc: "En 'Grupos' ves la tabla de posiciones que se arma automáticamente en base a tus predicciones de partidos. ¡No hace falta elegirlas manualmente!" },
  { icon: "🏆", title: "Eliminatorias y campeón", desc: "En 'Eliminatorias' predecís quién avanza ronda a ronda hasta el campeón. Estas predicciones se bloquean cuando arranca el torneo." },
  { icon: "🔥", title: "Modo Hardcore", desc: "Activando Hardcore tenés que acertar el marcador exacto de cada partido. Si acertás, ganás puntos extra además de los normales." },
  { icon: "💾", title: "Guardá tus predicciones", desc: "El botón de guardar aparece cuando tenés cambios pendientes. No te olvides de guardar antes de salir, ¡o perdés tus selecciones!" },
];
import {
  getMatchPredictionClosedReason,
  getMatchPredictionDeadlineHint,
  isMatchPredictionWindowOpen,
} from "@/lib/match-utils";
import {
  BRACKET_MATCHES,
  BracketMatch,
  getSourceLabel,
} from "@/lib/bracket-structure";
import {
  ELIMINATORIAS_PHASES,
  type ElimPhaseKey,
  BracketContext,
  bracketKey,
  normalizeSavedBracket,
  normalizeMatchSlot,
  resolveSource as resolveBracketSource,
  getThirdSlotPickState,
  validateThirdSlotRival,
  getThirdSlotMatches,
  isProjectedThirdTeamId,
  getAssignedThirdTeamIds,
  computeThirdPlaceRankings,
  validateBracketPick,
  validatePendingBracketPicks,
  countSaveableBracketPicks,
  getBracketMatchCompleteness,
  getThirdSlotPickerEntries,
  type BracketMatchCompleteness,
  isPhaseUnlocked as checkPhaseUnlocked,
  getPhaseUnlockBlockReason,
  getEligibleChampionTeams,
  isBracketPickStale,
  canReplaceBracketPick,
  formatMatchPickHint,
  getMatchWinnerOptions,
  getDownstreamBracketKeys,
} from "@/lib/bracket-validation";

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string;
}

interface Match {
  id: string;
  matchCode: string;
  phase: string;
  status: string;
  startDate?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number;
  awayScore?: number;
  group?: { id: string; name: string };
}

interface Group {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
}

type Outcome = "home" | "away" | "draw";

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "A confirmar";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

export default function PredictionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  const [savedPreds, setSavedPreds] = useState<Record<string, Outcome>>({});
  const [savedGroupPreds, setSavedGroupPreds] = useState<Record<string, { first?: string; second?: string; third?: string }>>({});
  const [savedBracket, setSavedBracket] = useState<Record<string, string>>({});

  const [pendingPreds, setPendingPreds] = useState<Record<string, Outcome>>({});
  const [pendingBracket, setPendingBracket] = useState<Record<string, string>>({});
  const [pendingThirdSlotAssignments, setPendingThirdSlotAssignments] = useState<Record<string, string>>({});
  const [bracketFieldErrors, setBracketFieldErrors] = useState<Record<string, string>>({});

  const [savingGroup, setSavingGroup] = useState<Record<string, boolean>>({});
  const [savingBracket, setSavingBracket] = useState(false);
  const [savingMatchScore, setSavingMatchScore] = useState<Record<string, boolean>>({});
  const [savingBracketMatch, setSavingBracketMatch] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<"matches" | "groups" | "eliminatorias">("matches");
  const [activeElimTab, setActiveElimTab] = useState<ElimPhaseKey>(ELIMINATORIAS_PHASES[0].key);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [changeCost, setChangeCost] = useState(800);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [changesRemaining, setChangesRemaining] = useState(0);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [buyingChange, setBuyingChange] = useState(false);
  const [usingChange, setUsingChange] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const [hardcoreMode, setHardcoreMode] = useState(false);
  const [togglingHardcore, setTogglingHardcore] = useState(false);
  const [pendingScores, setPendingScores] = useState<Record<string, { home?: number; away?: number }>>({});
  const [savedScores, setSavedScores] = useState<Record<string, { home: number; away: number }>>({});
  const [pendingBracketScores, setPendingBracketScores] = useState<Record<string, { home?: number; away?: number }>>({});
  const [savedBracketScores, setSavedBracketScores] = useState<Record<string, { home: number; away: number }>>({});
  const [showHardcoreSpotlight, setShowHardcoreSpotlight] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  // Team selection modal for bracket picks
  const [selectionModal, setSelectionModal] = useState<{ phase: string; slot: string } | null>(null);
  const [predictionsCta, setPredictionsCta] = useState<{
    text: string; textColor?: string;
    textAccent?: string; textAccentColor?: string;
    buttonLabel: string; buttonUrl: string; buttonTextColor?: string;
    buttonLogoUrl?: string; buttonLogo2Url?: string; logoPosition?: string;
    bgColor?: string; buttonColor?: string;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) { router.replace("/login"); return; }
      const meData = await meRes.json();
      if (meData.user?.hardcoreMode) setHardcoreMode(true);

      const [groupsRes, predRes, groupPredRes, bracketRes, changeRes, bannerRes] = await Promise.all([
        fetch("/api/public/groups"),
        apiFetch("/api/participant/predictions"),
        apiFetch("/api/participant/group-predictions"),
        apiFetch("/api/participant/bracket-predictions"),
        apiFetch("/api/participant/prediction-change"),
        fetch("/api/public/sponsor-banners"),
      ]);

      const sp: Record<string, Outcome> = {};
      const sg: Record<string, { first?: string; second?: string; third?: string }> = {};
      const sb: Record<string, string> = {};

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        const g: Group[] = data.groups || [];
        setGroups(g);
        const teams: Team[] = [];
        const seen = new Set<string>();
        for (const gr of g) for (const t of gr.teams) {
          if (!seen.has(t.id)) { teams.push(t); seen.add(t.id); }
        }
        setAllTeams(teams.sort((a, b) => a.name.localeCompare(b.name)));
        if (g.length > 0) setExpandedGroups({ [g[0].id]: true });
      }

      if (predRes.ok) {
        const data = await predRes.json();
        const scores: Record<string, { home: number; away: number }> = {};
        for (const p of data.predictions || []) {
          if (p.predictedOutcome) sp[p.matchId] = p.predictedOutcome;
          if (p.predictedHomeScore !== null && p.predictedHomeScore !== undefined &&
              p.predictedAwayScore !== null && p.predictedAwayScore !== undefined) {
            scores[p.matchId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
          }
        }
        setSavedPreds(sp);
        setSavedScores(scores);
      }

      if (groupPredRes.ok) {
        const data = await groupPredRes.json();
        for (const p of data.groupPredictions || [])
          sg[p.groupId] = { first: p.firstTeamId || undefined, second: p.secondTeamId || undefined, third: p.thirdTeamId || undefined };
        setSavedGroupPreds(sg);
      }

      if (bracketRes.ok) {
        const data = await bracketRes.json();
        const bracketScores: Record<string, { home: number; away: number }> = {};
        for (const p of data.bracketPredictions || []) {
          if (p.predictedTeamId) {
            sb[bracketKey(p.phase, p.matchSlot)] = p.predictedTeamId;
          }
          if (p.predictedHomeScore !== null && p.predictedHomeScore !== undefined &&
              p.predictedAwayScore !== null && p.predictedAwayScore !== undefined) {
            bracketScores[bracketKey(p.phase, p.matchSlot)] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
          }
        }
        setSavedBracket(normalizeSavedBracket(sb));
        setSavedBracketScores(bracketScores);
      }

      if (changeRes.ok) {
        const data = await changeRes.json();
        setChangeCost(data.cost);
        setAvailablePoints(data.available);
        setChangesRemaining(data.changesRemaining ?? 0);
      }

      if (bannerRes.ok) {
        const bannerData = await bannerRes.json();
        if (bannerData.predictions?.visible && (bannerData.predictions.text || bannerData.predictions.buttonLabel)) {
          setPredictionsCta(bannerData.predictions);
        }
      }

      const hasSeenOnboarding = typeof window !== "undefined" && localStorage.getItem("pred_onboarding_seen");
      const hasSeenHardcoreSpotlight = typeof window !== "undefined" && localStorage.getItem("hardcore_spotlight_seen");
      const missingAny =
        Object.keys(sp).length === 0 ||
        Object.keys(sg).length === 0 ||
        Object.keys(sb).length === 0;
      if (missingAny && !hasSeenOnboarding) setShowOnboarding(true);
      // Show hardcore spotlight on page load when predictions incomplete, not hardcore, not seen before
      if (missingAny && !meData.user?.hardcoreMode && !hasSeenHardcoreSpotlight && hasSeenOnboarding) {
        setShowHardcoreSpotlight(true);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  // ── Bracket context (confirmed picks only for downstream resolution) ────────

  const thirdSlotAssignments = useMemo(() => {
    const merged: Record<string, string> = { ...pendingThirdSlotAssignments };
    if (allTeams.length === 0 || groups.length === 0) return merged;

    const baseCtx: BracketContext = {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        teams: g.teams,
        matches: g.matches.map((m) => ({
          id: m.id,
          phase: m.phase,
          homeTeamId: m.homeTeam?.id ?? null,
          awayTeamId: m.awayTeam?.id ?? null,
        })),
      })),
      allTeams,
      savedPreds: savedPreds as Record<string, string>,
      savedGroupPreds,
      savedBracket,
      savedScores,
    };

    for (const match of getThirdSlotMatches()) {
      const key = bracketKey("ROUND_OF_32", String(match.matchNum));
      if (merged[key]) continue;
      const winnerId = savedBracket[key];
      if (winnerId && isProjectedThirdTeamId(baseCtx, winnerId)) {
        merged[key] = winnerId;
      }
    }
    return merged;
  }, [
    allTeams,
    groups,
    savedPreds,
    savedGroupPreds,
    savedBracket,
    savedScores,
    pendingThirdSlotAssignments,
  ]);

  const bracketCtx: BracketContext = {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      teams: g.teams,
      matches: g.matches.map((m) => ({
        id: m.id,
        phase: m.phase,
        homeTeamId: m.homeTeam?.id ?? null,
        awayTeamId: m.awayTeam?.id ?? null,
      })),
    })),
    allTeams,
    savedPreds: savedPreds as Record<string, string>,
    savedGroupPreds,
    savedBracket,
    pendingBracket,
    thirdSlotAssignments,
    savedScores,
  };

  const displayBracketCtx: BracketContext = {
    ...bracketCtx,
    savedBracket: { ...savedBracket, ...pendingBracket },
  };

  const isPhaseUnlocked = useCallback(
    (phaseKey: string) => checkPhaseUnlocked(phaseKey, bracketCtx),
    [groups, allTeams, savedPreds, savedGroupPreds, savedBracket]
  );

  const getPhaseBlockReason = useCallback(
    (phaseKey: string) => getPhaseUnlockBlockReason(phaseKey, bracketCtx),
    [groups, allTeams, savedPreds, savedGroupPreds, savedBracket]
  );

  const getEligibleTeams = useCallback(
    (phaseKey: string): Team[] => {
      if (phaseKey === "CHAMPION") return getEligibleChampionTeams(bracketCtx) as Team[];
      return [];
    },
    [groups, allTeams, savedPreds, savedGroupPreds, savedBracket]
  );

  const resolveSource = useCallback(
    (source: string): Team | null =>
      resolveBracketSource(source, bracketCtx) as Team | null,
    [groups, allTeams, savedPreds, savedGroupPreds, savedBracket]
  );

  useEffect(() => {
    if (loading) return;
    if (!isPhaseUnlocked(activeElimTab)) {
      const firstOpen = ELIMINATORIAS_PHASES.find((p) => isPhaseUnlocked(p.key));
      if (firstOpen) setActiveElimTab(firstOpen.key);
    }
  }, [loading, activeElimTab, isPhaseUnlocked]);

  const handlePickMatch = useCallback((matchId: string, outcome: Outcome) => {
    if (savedPreds[matchId]) return;
    setPendingPreds(prev => {
      if (prev[matchId] === outcome) { const n = { ...prev }; delete n[matchId]; return n; }
      return { ...prev, [matchId]: outcome };
    });
  }, [savedPreds]);

  const handleSaveGroupMatches = useCallback(async (groupId: string, matches: Match[]) => {
    setSavingGroup(prev => ({ ...prev, [groupId]: true }));
    let ok = 0;
    let derived: { firstTeamId: string | null; secondTeamId: string | null; thirdTeamId: string | null } | null = null;

    for (const match of matches) {
      if (savedPreds[match.id]) continue;
      if (!isMatchPredictionWindowOpen(match.startDate)) continue;

      if (hardcoreMode) {
        const score = pendingScores[match.id];
        if (score?.home === undefined || score?.away === undefined) continue;
        try {
          const res = await apiFetch("/api/participant/predictions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: match.id, predictedHomeScore: score.home, predictedAwayScore: score.away }),
          });
          if (res.ok) {
            const data = await res.json();
            const outcome = score.home > score.away ? "home" : score.away > score.home ? "away" : "draw";
            setSavedPreds(prev => ({ ...prev, [match.id]: outcome as Outcome }));
            setSavedScores(prev => ({ ...prev, [match.id]: { home: score.home!, away: score.away! } }));
            setPendingScores(prev => { const n = { ...prev }; delete n[match.id]; return n; });
            ok++;
            if (data.derivedGroup) derived = data.derivedGroup;
          } else { const d = await res.json(); toast.error(d.error || "Error"); }
        } catch { toast.error("Error de conexión"); }
      } else {
        const outcome = pendingPreds[match.id];
        if (!outcome) continue;
        try {
          const res = await apiFetch("/api/participant/predictions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: match.id, predictedOutcome: outcome }),
          });
          if (res.ok) {
            const data = await res.json();
            setSavedPreds(prev => ({ ...prev, [match.id]: outcome }));
            setPendingPreds(prev => { const n = { ...prev }; delete n[match.id]; return n; });
            ok++;
            if (data.derivedGroup) derived = data.derivedGroup;
          } else { const d = await res.json(); toast.error(d.error || "Error"); }
        } catch { toast.error("Error de conexión"); }
      }
    }
    if (ok > 0) {
      toast.success(`${ok} predicción${ok > 1 ? "es" : ""} confirmada${ok > 1 ? "s" : ""} ✓`);
      if (derived) {
        setSavedGroupPreds(prev => ({
          ...prev,
          [groupId]: {
            first:  derived!.firstTeamId  ?? undefined,
            second: derived!.secondTeamId ?? undefined,
            third:  derived!.thirdTeamId  ?? undefined,
          },
        }));
      }
    }
    setSavingGroup(prev => ({ ...prev, [groupId]: false }));
  }, [pendingPreds, pendingScores, savedPreds, hardcoreMode]);

  const handleSaveMatchScore = useCallback(async (matchId: string, groupId: string | undefined, homeScore: number, awayScore: number) => {
    setSavingMatchScore(prev => ({ ...prev, [matchId]: true }));
    try {
      const res = await apiFetch("/api/participant/predictions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, predictedHomeScore: homeScore, predictedAwayScore: awayScore }),
      });
      if (res.ok) {
        const data = await res.json();
        const outcome: Outcome = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";
        setSavedPreds(prev => ({ ...prev, [matchId]: outcome }));
        setSavedScores(prev => ({ ...prev, [matchId]: { home: homeScore, away: awayScore } }));
        setPendingScores(prev => { const n = { ...prev }; delete n[matchId]; return n; });
        toast.success("Marcador confirmado ✓");
        if (data.derivedGroup && groupId) {
          setSavedGroupPreds(prev => ({
            ...prev,
            [groupId]: {
              first:  data.derivedGroup.firstTeamId  ?? undefined,
              second: data.derivedGroup.secondTeamId ?? undefined,
              third:  data.derivedGroup.thirdTeamId  ?? undefined,
            },
          }));
        }
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al guardar marcador");
      }
    } catch { toast.error("Error de conexión"); }
    setSavingMatchScore(prev => ({ ...prev, [matchId]: false }));
  }, []);

  const handleSaveBracketMatchScore = useCallback(async (phase: string, slot: string, home: number, away: number) => {
    const key = `${phase}:${slot}`;
    const teamId = savedBracket[key];
    if (!teamId) return;

    // Winner validation
    if (home !== away) {
      const matchNum = parseInt(slot);
      const bm = (BRACKET_MATCHES[phase] ?? []).find(m => m.matchNum === matchNum);
      if (bm) {
        const lt = resolveSource(bm.leftSource);
        const rt = resolveSource(bm.rightSource);
        if (home > away && lt && teamId !== lt.id) { toast.error("El marcador no puede cambiar el equipo elegido"); return; }
        if (away > home && rt && teamId !== rt.id) { toast.error("El marcador no puede cambiar el equipo elegido"); return; }
      }
    }

    setSavingBracketMatch(prev => ({ ...prev, [key]: true }));
    try {
      const res = await apiFetch("/api/participant/bracket-predictions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, matchSlot: slot, predictedTeamId: teamId, predictedHomeScore: home, predictedAwayScore: away }),
      });
      if (res.ok) {
        setSavedBracketScores(prev => ({ ...prev, [key]: { home, away } }));
        setPendingBracketScores(prev => { const n = { ...prev }; delete n[key]; return n; });
        toast.success("Marcador confirmado ✓");
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al guardar marcador");
      }
    } catch { toast.error("Error de conexión"); }
    setSavingBracketMatch(prev => ({ ...prev, [key]: false }));
  }, [savedBracket, resolveSource]);

  const handleAssignThirdRival = useCallback((phase: string, slot: string, teamId: string) => {
    const key = bracketKey(phase, slot);
    if (!canReplaceBracketPick(phase, slot, savedBracket[key], bracketCtx)) return;

    const match = (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === parseInt(slot, 10));
    if (!match) return;

    const validation = validateThirdSlotRival(match, teamId, {
      ...bracketCtx,
      pendingBracket,
      thirdSlotAssignments,
    }, key);
    if (!validation.valid) {
      toast.error(validation.error || "Tercero inválido", { duration: 6000 });
      return;
    }

    setPendingThirdSlotAssignments(prev => ({ ...prev, [key]: teamId }));
    setPendingBracket(prev => {
      const next = { ...prev };
      const oldWinner = next[key];
      if (oldWinner && oldWinner !== teamId && isProjectedThirdTeamId(bracketCtx, oldWinner)) {
        delete next[key];
      }
      return next;
    });
    setBracketFieldErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [savedBracket, bracketCtx, pendingBracket, thirdSlotAssignments]);

  const handlePickBracket = useCallback((phase: string, slot: string, teamId: string) => {
    const key = bracketKey(phase, slot);
    if (!canReplaceBracketPick(phase, slot, savedBracket[key], bracketCtx)) return;

    const match = (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === parseInt(slot, 10));
    const isThirdSlot = match && (match.leftSource.startsWith("3") || match.rightSource.startsWith("3"));

    const validation = validateBracketPick(phase, slot, teamId, {
      ...bracketCtx,
      pendingBracket: { ...pendingBracket, [key]: teamId },
    });
    if (!validation.valid) {
      toast.error(validation.error || "Selección inválida", { duration: 6000 });
      return;
    }

    if (isThirdSlot && isProjectedThirdTeamId(bracketCtx, teamId) && thirdSlotAssignments[key] !== teamId) {
      if (match) {
        toast.error(formatMatchPickHint(match, bracketCtx, key), { duration: 6000 });
      }
      return;
    }

    setPendingBracket(prev => ({ ...prev, [key]: teamId }));
    setBracketFieldErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [savedBracket, pendingBracket, bracketCtx, thirdSlotAssignments]);

  const handlePickBracketScore = useCallback((phase: string, matchNum: number, side: "home" | "away", value: number) => {
    const key = bracketKey(phase, String(matchNum));
    setPendingBracketScores(prev => ({ ...prev, [key]: { ...prev[key], [side]: value } }));
  }, []);

  const handleSaveCurrentPhase = useCallback(async () => {
    // New picks (team selections) — only matches with both teams + winner chosen
    const phasePending = Object.entries(pendingBracket)
      .filter(([k]) => k.startsWith(`${activeElimTab}:`))
      .filter(([key, teamId]) => {
        const [p, slot] = key.split(":");
        if (!p || !slot) return false;
        const savedId = savedBracket[key];
        if (savedId && !canReplaceBracketPick(p, slot, savedId, bracketCtx)) return false;
        const matchNum = parseInt(normalizeMatchSlot(p, slot), 10);
        const match = (BRACKET_MATCHES[p] ?? []).find((m) => m.matchNum === matchNum);
        if (!match) return false;
        return getBracketMatchCompleteness(match, bracketCtx, key, teamId).isComplete;
      });
    // Score-only upgrades: already saved team, no saved score, pending score entered
    const phaseScoreUpgrades = hardcoreMode
      ? Object.keys(savedBracket)
          .filter(k => {
            if (!k.startsWith(`${activeElimTab}:`)) return false;
            if (savedBracketScores[k]) return false;
            const s = pendingBracketScores[k];
            return s?.home !== undefined && s?.away !== undefined;
          })
      : [];

    if (phasePending.length === 0 && phaseScoreUpgrades.length === 0) return;

    const preErrors = validatePendingBracketPicks(
      activeElimTab,
      pendingBracket,
      bracketCtx,
      savedBracket
    );
    if (preErrors.length > 0) {
      const errorMap = Object.fromEntries(preErrors.map((e) => [e.key, e.error]));
      setBracketFieldErrors((prev) => ({ ...prev, ...errorMap }));
      toast.error(preErrors[0].error, { duration: 6000 });
      document.getElementById(`bracket-match-${preErrors[0].matchNum}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setSavingBracket(true);
    setBracketFieldErrors({});
    let ok = 0;
    let failed = false;

    // Save new picks (ascending match order so upstream W-picks exist before downstream)
    const sortedPending = [...phasePending].sort(
      ([a], [b]) => parseInt(a.split(":")[1] ?? "0", 10) - parseInt(b.split(":")[1] ?? "0", 10)
    );
    for (const [key, teamId] of sortedPending) {
      const [phase, slot] = key.split(":");
      if (savedBracket[key] && !canReplaceBracketPick(phase, slot, savedBracket[key], bracketCtx)) continue;
      const matchNum = parseInt(slot);
      const score = hardcoreMode ? pendingBracketScores[key] : undefined;
      const scorePayload = (score?.home !== undefined && score?.away !== undefined)
        ? { predictedHomeScore: score.home, predictedAwayScore: score.away }
        : {};
      try {
        const match = (BRACKET_MATCHES[phase] ?? []).find((m) => m.matchNum === matchNum);
        const isThirdSlot = match && (match.leftSource.startsWith("3") || match.rightSource.startsWith("3"));
        const assignedThirdTeamId = isThirdSlot ? thirdSlotAssignments[key] : undefined;
        const res = await apiFetch("/api/participant/bracket-predictions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            matchSlot: slot,
            predictedTeamId: teamId,
            ...(assignedThirdTeamId ? { assignedThirdTeamId } : {}),
            ...scorePayload,
          }),
        });
        if (res.ok) {
          setSavedBracket(prev => ({ ...prev, [key]: teamId }));
          setPendingBracket(prev => { const n = { ...prev }; delete n[key]; return n; });
          setPendingThirdSlotAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
          if (score?.home !== undefined && score?.away !== undefined) {
            setSavedBracketScores(prev => ({ ...prev, [key]: { home: score.home!, away: score.away! } }));
            setPendingBracketScores(prev => { const n = { ...prev }; delete n[key]; return n; });
          }
          ok++;
        } else {
          const d = await res.json();
          const matchNum = parseInt(slot, 10);
          const msg = d.error
            ? (String(d.error).startsWith("P") ? d.error : `P${matchNum}: ${d.error}`)
            : `P${matchNum}: Error al guardar`;
          setBracketFieldErrors(prev => ({ ...prev, [key]: msg }));
          toast.error(msg, { duration: 6000 });
          document.getElementById(`bracket-match-${matchNum}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          failed = true;
          break;
        }
      } catch {
        toast.error("Error de conexión");
        failed = true;
        break;
      }
    }

    if (failed) {
      setSavingBracket(false);
      return;
    }

    // Save score-only upgrades on already-locked bracket predictions
    for (const key of phaseScoreUpgrades) {
      const [phase, slot] = key.split(":");
      const score = pendingBracketScores[key];
      const teamId = savedBracket[key];

      // Winner validation
      if (score.home! !== score.away!) {
        const bm = (BRACKET_MATCHES[phase] ?? []).find(m => m.matchNum === parseInt(slot));
        if (bm) {
          const lt = resolveSource(bm.leftSource);
          const rt = resolveSource(bm.rightSource);
          if (score.home! > score.away! && lt && teamId !== lt.id) {
            toast.error("El marcador no puede cambiar el equipo elegido"); continue;
          }
          if (score.away! > score.home! && rt && teamId !== rt.id) {
            toast.error("El marcador no puede cambiar el equipo elegido"); continue;
          }
        }
      }

      try {
        const res = await apiFetch("/api/participant/bracket-predictions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase, matchSlot: slot, predictedTeamId: teamId, predictedHomeScore: score.home, predictedAwayScore: score.away }),
        });
        if (res.ok) {
          setSavedBracketScores(prev => ({ ...prev, [key]: { home: score.home!, away: score.away! } }));
          setPendingBracketScores(prev => { const n = { ...prev }; delete n[key]; return n; });
          ok++;
        } else { const d = await res.json(); toast.error(d.error || "Error"); }
      } catch { toast.error("Error de conexión"); }
    }

    if (ok > 0) toast.success(`${ok} selección${ok > 1 ? "es" : ""} guardada${ok > 1 ? "s" : ""} ✓`);
    setSavingBracket(false);
  }, [pendingBracket, savedBracket, savedBracketScores, activeElimTab, hardcoreMode, pendingBracketScores, resolveSource, bracketCtx, thirdSlotAssignments]);

  const handleToggleHardcore = useCallback(async () => {
    setTogglingHardcore(true);
    try {
      const newVal = !hardcoreMode;
      const res = await apiFetch("/api/participant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardcoreMode: newVal }),
      });
      if (!res.ok) { toast.error("Error al cambiar modo"); return; }
      setHardcoreMode(newVal);
      toast.success(newVal ? "🔥 Modo Hardcore activado" : "Modo normal activado");
    } catch { toast.error("Error de conexión"); }
    finally { setTogglingHardcore(false); }
  }, [hardcoreMode]);

  const handlePickScore = useCallback((matchId: string, side: "home" | "away", value: number) => {
    // Block only if score is already saved; allow entry when outcome is saved but score is missing (hardcore re-save)
    if (savedPreds[matchId] && savedScores[matchId]) return;
    setPendingScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }));
  }, [savedPreds, savedScores]);

  const handleBuyChange = useCallback(async () => {
    setBuyingChange(true);
    try {
      const res = await apiFetch("/api/participant/prediction-change", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      toast.success(data.message);
      setAvailablePoints(p => p - changeCost);
      setChangesRemaining(data.changesRemaining ?? 0);
      setShowChangeModal(false);
      window.dispatchEvent(new CustomEvent("pointsUpdated"));
    } catch { toast.error("Error de conexión"); }
    finally { setBuyingChange(false); }
  }, [changeCost]);

  const handleUseChange = useCallback(async (type: "match" | "group" | "bracket", id: string) => {
    if (changesRemaining <= 0) { toast.error("No tenés créditos disponibles"); return; }
    setUsingChange(true);
    try {
      const res = await apiFetch("/api/participant/prediction-change/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      setChangesRemaining(data.changesRemaining ?? 0);
      // Unlock in local state
      if (type === "match") {
        setSavedPreds(prev => { const n = { ...prev }; delete n[id]; return n; });
        setSavedScores(prev => { const n = { ...prev }; delete n[id]; return n; });
      } else if (type === "group") {
        setSavedGroupPreds(prev => { const n = { ...prev }; delete n[id]; return n; });
      } else if (type === "bracket") {
        const [phase, ...rest] = id.split(":");
        const slot = rest.join(":");
        setSavedBracket(prev => {
          const n = { ...prev };
          delete n[id];
          delete n[bracketKey(phase, slot)];
          for (const k of getDownstreamBracketKeys(phase, slot)) delete n[k];
          return n;
        });
        setSavedBracketScores(prev => {
          const n = { ...prev };
          delete n[id];
          delete n[bracketKey(phase, slot)];
          for (const k of getDownstreamBracketKeys(phase, slot)) delete n[k];
          return n;
        });
      }
      toast.success("¡Predicción desbloqueada! Podés modificarla ahora.");
    } catch { toast.error("Error de conexión"); }
    finally { setUsingChange(false); }
  }, [changesRemaining]);

  // Unsaved changes detection
  const hasUnsaved =
    Object.keys(pendingPreds).length > 0 ||
    Object.keys(pendingBracket).length > 0 ||
    Object.values(pendingScores).some((s) => s.home !== undefined || s.away !== undefined) ||
    Object.values(pendingBracketScores).some((s) => s.home !== undefined || s.away !== undefined);

  // Persist unsaved state to sessionStorage so other pages can warn the user
  useEffect(() => {
    if (hasUnsaved) {
      sessionStorage.setItem("pred_unsaved", "1");
    } else {
      sessionStorage.removeItem("pred_unsaved");
    }
  }, [hasUnsaved]);

  // Warn on reload / tab close / external navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    if (hasUnsaved) window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  // Intercept internal link clicks when there are unsaved changes
  useEffect(() => {
    if (!hasUnsaved) return;
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href === "/predictions") return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
      setShowUnsavedModal(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasUnsaved]);

  if (loading) return <LoadingScreen text="Cargando predicciones..." />;

  const completedGroupsCount = groups.filter(group => {
    const groupMatches = group.matches.filter(m => m.phase === "GROUP_STAGE");
    return groupMatches.length > 0 && groupMatches.every(m => !!savedPreds[m.id]);
  }).length;

  const hasAnyLocked =
    Object.keys(savedPreds).length > 0 ||
    Object.keys(savedGroupPreds).length > 0 ||
    Object.keys(savedBracket).length > 0;

  const currentPhase = ELIMINATORIAS_PHASES.find(p => p.key === activeElimTab)!;
  const currentPhasePendingCount = countSaveableBracketPicks(
    activeElimTab,
    pendingBracket,
    bracketCtx
  ) +
    (hardcoreMode
      ? Object.keys(savedBracket).filter(k => {
          if (!k.startsWith(`${activeElimTab}:`)) return false;
          if (savedBracketScores[k]) return false;
          const s = pendingBracketScores[k];
          if (s?.home === undefined || s?.away === undefined) return false;
          // Winner validation: only count if scores respect the locked pick
          if (s.home !== s.away) {
            const [phase, slot] = k.split(":");
            const bm = (BRACKET_MATCHES[phase] ?? []).find(m => m.matchNum === parseInt(slot));
            if (bm) {
              const lt = resolveSource(bm.leftSource);
              const rt = resolveSource(bm.rightSource);
              const pickedId = savedBracket[k];
              if (s.home > s.away && lt && pickedId !== lt.id) return false;
              if (s.away > s.home && rt && pickedId !== rt.id) return false;
            }
          }
          return true;
        }).length
      : 0);
  const savedInPhase = Object.keys(savedBracket).filter(k => k.startsWith(`${activeElimTab}:`)).length;
  const pendingInPhase = countSaveableBracketPicks(activeElimTab, pendingBracket, bracketCtx);
  const draftInPhase = Object.keys(pendingBracket).filter(
    (k) => k.startsWith(`${activeElimTab}:`) && !savedBracket[k]
  ).length - pendingInPhase;
  const phaseMatchCount = (BRACKET_MATCHES[currentPhase.key] ?? []).length;
  const emptyInPhase = Math.max(0, phaseMatchCount - savedInPhase - pendingInPhase);
  const errorsInPhase = Object.keys(bracketFieldErrors).filter((k) =>
    k.startsWith(`${activeElimTab}:`)
  ).length;
  const currentPhaseUnlocked = isPhaseUnlocked(activeElimTab);

  // Ensure active elim tab is always an unlocked phase
  const eligibleTeams = selectionModal ? getEligibleTeams(selectionModal.phase) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight">
                Mis <span className="text-red-500">Predicciones</span>
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Predecí resultados, clasificados y campeón</p>
            </div>
            <GuidedTour steps={PREDICTIONS_TOUR} storageKey="predictions_tour" />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleToggleHardcore}
              disabled={togglingHardcore}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                hardcoreMode
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {hardcoreMode ? "Hardcore: ON" : "Modo Hardcore"}
            </button>
            <button
              onClick={() => setShowPointsModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Puntos y logros
            </button>
            {predictionsCta && (() => {
              const bg = predictionsCta.bgColor ?? "#111111";
              const btnColor = predictionsCta.buttonColor ?? "#dc2626";
              const txtColor = predictionsCta.textColor ?? "#9ca3af";
              const accentColor = predictionsCta.textAccentColor ?? "#ffffff";
              const btnTxtColor = predictionsCta.buttonTextColor ?? "#ffffff";
              const pos = predictionsCta.logoPosition ?? "left";
              const logo1 = predictionsCta.buttonLogoUrl;
              const logo2 = predictionsCta.buttonLogo2Url;
              const Logo = ({ src }: { src: string }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-3.5 w-auto object-contain flex-shrink-0" />
              );
              return (
                <div
                  className="flex-1 min-w-0 flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider"
                  style={{ background: bg, borderColor: `${btnColor}55`, boxShadow: `0 0 12px 1px ${btnColor}33` }}
                >
                  <span className="truncate">
                    {predictionsCta.text && <span style={{ color: txtColor }}>{predictionsCta.text}</span>}
                    {predictionsCta.text && predictionsCta.textAccent && " "}
                    {predictionsCta.textAccent && <span style={{ color: accentColor }}>{predictionsCta.textAccent}</span>}
                  </span>
                  {predictionsCta.buttonUrl && (logo1 || logo2 || predictionsCta.buttonLabel) && (
                    <a
                      href={predictionsCta.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wide rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: btnColor }}
                    >
                      {(pos === "left" || pos === "sides") && logo1 && <Logo src={logo1} />}
                      {pos === "left" && logo2 && <Logo src={logo2} />}
                      {predictionsCta.buttonLabel && <span style={{ color: btnTxtColor }}>{predictionsCta.buttonLabel}</span>}
                      {pos === "right" && logo1 && <Logo src={logo1} />}
                      {(pos === "right" || pos === "sides") && logo2 && <Logo src={logo2} />}
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Hardcore banner */}
        {hardcoreMode && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-orange-300 text-sm font-bold">Modo Hardcore activo</p>
              <p className="text-orange-500/70 text-xs mt-0.5">
                Predecí el marcador exacto de cada partido. Si acertás, sumás <span className="text-orange-300 font-bold">+500 pts extra</span> por encima del resultado.
              </p>
            </div>
          </motion.div>
        )}

        {/* Credits banner */}
        {changesRemaining > 0 && (
          <div className="mb-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <Gift className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm font-bold flex-1">
              Tenés <span className="text-green-400">{changesRemaining} crédito{changesRemaining !== 1 ? "s" : ""}</span> para cambiar predicciones
            </p>
            <span className="text-green-600 text-xs">Tocá "Cambiar" en cualquier predicción bloqueada</span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-sm font-bold">⚠️ Una vez confirmada, tu predicción queda bloqueada</p>
            <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">
              No podrás cambiarla después de confirmar. Canjear <span className="text-amber-400 font-semibold">{changeCost} pts</span> te da <strong className="text-amber-400">3 créditos</strong> para cambiar predicciones individuales.
            </p>
          </div>
          {hasAnyLocked && changesRemaining === 0 && (
            <button
              onClick={() => setShowChangeModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-colors"
            >
              <Gift className="w-3.5 h-3.5" /> Obtener créditos
            </button>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-8">
          {[
            { key: "matches",       label: "Partidos",      icon: <Target className="w-3.5 h-3.5" /> },
            { key: "groups",        label: "Grupos",        icon: <Users  className="w-3.5 h-3.5" /> },
            { key: "eliminatorias", label: "Eliminatorias", icon: <Trophy className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.key ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-gray-300"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── PARTIDOS ─────────────────────────────────────────────────────── */}
        {activeTab === "matches" && (
          <div className="space-y-3">
            {/* Points info */}
            <div className="bg-[#0f1a0f] border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-xs font-black uppercase tracking-widest mb-3">¿Cuántos puntos ganás?</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <span className="text-lg leading-none">⚽</span>
                  <div>
                    <p className="text-white font-bold text-xs">Ganador / Perdedor</p>
                    <p className="text-yellow-400 font-black text-sm">500 pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <span className="text-lg leading-none">🤝</span>
                  <div>
                    <p className="text-white font-bold text-xs">Empate exacto</p>
                    <p className="text-yellow-400 font-black text-sm">800 pts</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-[10px] mt-2 leading-relaxed">
                El empate suma 800 pts (500 base + 300 bonus). Hay 48 partidos en fase de grupos.
                {hardcoreMode && <span className="text-orange-700"> · Modo Hardcore: +500 pts extra por marcador exacto.</span>}
              </p>
            </div>
            <div className="bg-[#161616] border border-[#222] rounded-xl p-4 mb-1">
              <p className="text-white text-sm font-bold mb-1">Plazo para predecir partidos</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Podés predecir cada partido <strong className="text-gray-300">solo hasta el día anterior</strong> al
                encuentro. El <strong className="text-gray-300">día del partido</strong> ya no se puede cargar ni
                modificar la predicción (aunque todavía no haya empezado el partido).
              </p>
            </div>
            {groups.length === 0 && <div className="p-8 text-center text-gray-500">No hay partidos disponibles aún.</div>}
            {groups.map(group => {
              const pendingCount = group.matches.filter(m => {
                if (savedPreds[m.id]) return false;
                if (hardcoreMode) {
                  const s = pendingScores[m.id];
                  return s?.home !== undefined && s?.away !== undefined;
                }
                return !!pendingPreds[m.id];
              }).length;
              const savedCount = group.matches.filter(m => savedPreds[m.id]).length;
              const allSaved = savedCount === group.matches.length;
              return (
                <div key={group.id} className={`rounded-xl overflow-hidden border transition-colors ${allSaved ? "border-green-500/15 bg-[#0d110d]" : "border-[#222] bg-[#111]"}`}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedGroups(p => ({ ...p, [group.id]: !p[group.id] }))}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${allSaved ? "bg-green-600" : "bg-red-600"} text-white`}>
                        {group.name}
                      </span>
                      <div className="text-left">
                        <div className="text-white font-bold text-sm">Grupo {group.name}</div>
                        <div className="text-gray-600 text-xs">{group.teams.map(t => t.name).join(" · ")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCount > 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                          {pendingCount} sin confirmar
                        </span>
                      )}
                      {allSaved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      <span className="text-xs text-gray-700">{savedCount}/{group.matches.length}</span>
                      {expandedGroups[group.id] ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedGroups[group.id] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 border-t border-[#1a1a1a] pt-3">
                          {group.matches.map((match, idx) => (
                            <motion.div key={match.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                              <MatchCard
                                match={match}
                                saved={savedPreds[match.id]}
                                pending={pendingPreds[match.id]}
                                hardcoreMode={hardcoreMode}
                                pendingScore={pendingScores[match.id]}
                                savedScore={savedScores[match.id]}
                                onPick={handlePickMatch}
                                onPickScore={handlePickScore}
                                onSaveScore={(home, away) => handleSaveMatchScore(match.id, group.id, home, away)}
                                savingScore={savingMatchScore[match.id]}
                                changesRemaining={changesRemaining}
                                onUseChange={handleUseChange}
                                usingChange={usingChange}
                              />
                            </motion.div>
                          ))}
                          {pendingCount > 0 && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                              <Button variant="primary" size="lg" loading={savingGroup[group.id]}
                                onClick={() => handleSaveGroupMatches(group.id, group.matches)} className="w-full text-base font-black py-4"
                                data-save-predictions>
                                <Save className="w-5 h-5" />
                                {`Confirmar ${pendingCount} predicción${pendingCount !== 1 ? "es" : ""} del Grupo ${group.name}`}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* ── GRUPOS ───────────────────────────────────────────────────────── */}
        {activeTab === "groups" && (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="bg-[#0f1a0f] border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl leading-none flex-shrink-0">🤖</span>
              <div>
                <p className="text-green-400 text-xs font-black uppercase tracking-widest mb-1">Tabla automática</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Las posiciones de cada grupo se calculan automáticamente en base a tus predicciones de partidos.
                  Clasifican los 2 primeros de cada grupo (24 equipos) + los 8 mejores terceros.
                </p>
              </div>
            </div>

            {groups.map(group => {
              // Compute implied standings from saved predictions
              const stats: Record<string, { pts: number; gd: number; gf: number; w: number; d: number; l: number }> = {};
              for (const t of group.teams) stats[t.id] = { pts: 0, gd: 0, gf: 0, w: 0, d: 0, l: 0 };

              let predictedCount = 0;
              const groupMatches = group.matches.filter(m => m.phase === "GROUP_STAGE");

              for (const m of groupMatches) {
                if (!m.homeTeam?.id || !m.awayTeam?.id) continue;
                const outcome = savedPreds[m.id];
                if (!outcome) continue;
                predictedCount++;

                const h = m.homeTeam.id, a = m.awayTeam.id;
                if (!stats[h]) stats[h] = { pts: 0, gd: 0, gf: 0, w: 0, d: 0, l: 0 };
                if (!stats[a]) stats[a] = { pts: 0, gd: 0, gf: 0, w: 0, d: 0, l: 0 };

                if (outcome === "home") {
                  stats[h].pts += 3; stats[h].w++;
                  stats[a].l++;
                } else if (outcome === "away") {
                  stats[a].pts += 3; stats[a].w++;
                  stats[h].l++;
                } else {
                  stats[h].pts += 1; stats[h].d++;
                  stats[a].pts += 1; stats[a].d++;
                }

                const score = savedScores[m.id];
                if (score) {
                  stats[h].gd += score.home - score.away;
                  stats[a].gd += score.away - score.home;
                  stats[h].gf += score.home;
                  stats[a].gf += score.away;
                }
              }

              const sorted = group.teams
                .map(t => ({ team: t, ...stats[t.id] ?? { pts: 0, gd: 0, gf: 0, w: 0, d: 0, l: 0 } }))
                .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

              const isComplete = predictedCount >= groupMatches.length && groupMatches.length > 0;
              const rankEmoji = ["🥇", "🥈", "🥉", "4°"];
              const rankColors = [
                "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                "text-gray-300 bg-[#1e1e1e] border-[#333]",
                "text-amber-700 bg-[#181512] border-[#2a1e0f]",
                "text-gray-700 bg-[#111] border-[#1a1a1a]",
              ];

              return (
                <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border overflow-hidden ${isComplete ? "border-green-500/20" : "border-[#222]"}`}>

                  {/* Header */}
                  <div className={`px-5 py-3.5 flex items-center gap-3 ${isComplete ? "bg-[#0d110d]" : "bg-[#111]"}`}>
                    <span className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {group.name}
                    </span>
                    <div>
                      <h3 className="text-white font-bold text-sm">Grupo {group.name}</h3>
                      <p className="text-gray-600 text-[11px]">{predictedCount}/{groupMatches.length} partidos predichos</p>
                    </div>
                    {isComplete && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tabla lista
                      </span>
                    )}
                  </div>

                  <div className={`${isComplete ? "bg-[#0d110d]" : "bg-[#0f0f0f]"}`}>
                    {/* Column headers */}
                    <div className="flex items-center px-4 py-2 border-b border-[#1a1a1a]">
                      <span className="w-6 flex-shrink-0" />
                      <span className="flex-1 text-[10px] font-bold text-gray-700 uppercase tracking-widest ml-2">Equipo</span>
                      <span className="w-7 text-center text-[10px] font-bold text-gray-700 uppercase">J</span>
                      <span className="w-7 text-center text-[10px] font-bold text-gray-700 uppercase">G</span>
                      <span className="w-7 text-center text-[10px] font-bold text-gray-700 uppercase">E</span>
                      <span className="w-7 text-center text-[10px] font-bold text-gray-700 uppercase">P</span>
                      <span className="w-8 text-center text-[10px] font-bold text-yellow-600 uppercase">Pts</span>
                    </div>

                    {sorted.map((row, i) => (
                      <div key={row.team.id}
                        className={`flex items-center px-4 py-3 gap-2 border-b border-[#161616] last:border-0 ${i < 2 && isComplete ? "bg-green-500/5" : ""}`}>
                        <span className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center border flex-shrink-0 ${rankColors[i]}`}>
                          {rankEmoji[i]}
                        </span>
                        {row.team.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.team.flagUrl} alt="" className="w-7 h-[18px] object-cover rounded flex-shrink-0 shadow" />
                        ) : (
                          <span className="w-7 h-[18px] bg-[#222] rounded flex-shrink-0" />
                        )}
                        <span className={`flex-1 font-semibold text-xs truncate ${i < 2 ? "text-white" : "text-gray-500"}`}>
                          {row.team.name}
                        </span>
                        <span className="w-7 text-center text-xs text-gray-600">{row.w + row.d + row.l}</span>
                        <span className="w-7 text-center text-xs text-gray-500">{row.w}</span>
                        <span className="w-7 text-center text-xs text-gray-500">{row.d}</span>
                        <span className="w-7 text-center text-xs text-gray-500">{row.l}</span>
                        <span className={`w-8 text-center text-sm font-black ${i < 2 && isComplete ? "text-green-400" : "text-gray-400"}`}>
                          {row.pts}
                        </span>
                      </div>
                    ))}

                    {!isComplete && (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <p className="text-gray-700 text-xs">Predecí todos los partidos para ver la tabla final</p>
                        <button
                          onClick={() => setActiveTab("matches")}
                          className="text-xs text-red-500 font-semibold hover:text-red-400 transition-colors"
                        >
                          Ir a Partidos →
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── ELIMINATORIAS ─────────────────────────────────────────────────── */}
        {activeTab === "eliminatorias" && (
          <div>
            {/* Phase sub-tabs */}
            <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-5 overflow-x-auto">
              {ELIMINATORIAS_PHASES.map(phase => {
                const phaseSaved   = Object.keys(savedBracket).filter(k => k.startsWith(`${phase.key}:`)).length;
                const phasePending = Object.keys(pendingBracket).filter(k => k.startsWith(`${phase.key}:`)).length;
                const isComplete   = phaseSaved === phase.slots;
                const isActive     = activeElimTab === phase.key;
                const unlocked     = isPhaseUnlocked(phase.key);
                return (
                  <button key={phase.key}
                    onClick={() => { if (unlocked) setActiveElimTab(phase.key); }}
                    className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-lg transition-all whitespace-nowrap min-w-[52px] ${
                      !unlocked ? "opacity-40 cursor-not-allowed" :
                      isActive  ? "bg-red-600 text-white shadow-lg shadow-red-500/20" :
                      "text-gray-500 hover:text-gray-300 cursor-pointer"
                    }`}
                  >
                    <span className="text-base leading-none mb-0.5">
                      {!unlocked ? "🔒" : phase.icon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{phase.label}</span>
                    <span className={`text-[9px] font-medium mt-0.5 ${
                      isActive ? "text-red-200" :
                      isComplete ? "text-green-500" :
                      phasePending > 0 ? "text-amber-500" :
                      phaseSaved > 0 ? "text-gray-500" : "text-gray-800"
                    }`}>
                      {!unlocked ? "Bloqueado" :
                       isComplete ? `✓ ${phase.slots}/${phase.slots}` :
                       phaseSaved > 0 ? `${phaseSaved}/${phase.slots}` :
                       phasePending > 0 ? `${phasePending} pend` : `0/${phase.slots}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Phase content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeElimTab}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>

                {!currentPhaseUnlocked ? (
                  /* Locked state */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-5xl mb-4">🔒</div>
                    <p className="text-white font-black text-lg mb-2">Fase bloqueada</p>
                    <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                      {getPhaseBlockReason(activeElimTab)}
                    </p>
                    {activeElimTab === "ROUND_OF_32" ? (
                      <>
                        <p className="text-gray-700 text-xs mt-3">
                          Grupos completos: {completedGroupsCount}/{groups.length}
                        </p>
                        <button
                          onClick={() => setActiveTab("matches")}
                          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          Ir a Partidos →
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const idx = ELIMINATORIAS_PHASES.findIndex(p => p.key === activeElimTab);
                          if (idx > 0) setActiveElimTab(ELIMINATORIAS_PHASES[idx - 1].key);
                        }}
                        className="mt-4 px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-white text-sm font-bold rounded-xl transition-colors"
                      >
                        Ir a fase anterior →
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Phase header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl flex-shrink-0">
                        {currentPhase.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-black text-lg leading-tight">{currentPhase.fullLabel}</h3>
                          <span className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {currentPhase.ptsLabel}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {currentPhase.key === "CHAMPION"
                            ? "Campeón: 30.000 pts · Subcampeón: 15.000 pts · Ambos exactos: +40.000 pts"
                            : `${savedInPhase} guardados · ${pendingInPhase} listos · ${Math.max(0, draftInPhase)} incompletos · ${emptyInPhase} sin elegir`}
                        </p>
                      </div>
                    </div>

                    {/* How to pick winners */}
                    {currentPhase.key !== "CHAMPION" && (
                      <div className="mb-4 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200/90 leading-relaxed">
                        <strong className="text-blue-200">¿Cómo funciona?</strong> Tocá el equipo que creés que{" "}
                        <strong className="text-blue-100">pasa a la siguiente ronda</strong>.
                        En cruces con terceros: primero elegí qué 3° juega (lista del otro lado) y después tocá quién gana el partido.
                      </div>
                    )}

                    {/* Phase status legend */}
                    {currentPhase.key !== "CHAMPION" && (
                      <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Guardado
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold">
                          Pendiente de confirmar
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#333] text-gray-500 font-bold">
                          Sin elegir
                        </span>
                        {errorsInPhase > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 font-bold">
                            <AlertTriangle className="w-3 h-3" /> {errorsInPhase} con error
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress bar */}
                    {currentPhase.key !== "CHAMPION" && (
                      <div className="mb-5 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(savedInPhase / currentPhase.slots) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }} />
                      </div>
                    )}

                    {/* Third-place tracker (R32 only) */}
                    {currentPhase.key === "ROUND_OF_32" && (() => {
                      const rankings = computeThirdPlaceRankings(bracketCtx);
                      const assigned = getAssignedThirdTeamIds(
                        bracketCtx,
                        { ...savedBracket, ...pendingBracket }
                      );
                      const qualifying = rankings.filter((r) => r.qualifies);
                      const groupsReady = rankings.length;
                      if (groupsReady === 0) {
                        return (
                          <div className="mb-4 px-3 py-2.5 bg-[#111] border border-[#222] rounded-xl text-xs text-gray-500">
                            Completá todos los partidos de grupos para calcular los 8 mejores terceros.
                          </div>
                        );
                      }
                      return (
                        <div className="mb-4 bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                          <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#1a1a1a]">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                              8 mejores terceros
                              {groupsReady < 12 && (
                                <span className="text-gray-600 font-normal normal-case ml-1">
                                  ({groupsReady}/12 grupos)
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-bold text-amber-400 tabular-nums">
                              {assigned.size}/8 terceros asignados
                            </span>
                          </div>
                          <div className="px-3 py-2 flex flex-wrap gap-1.5">
                            {qualifying.map((r) => {
                              const isAssigned = assigned.has(r.teamId);
                              return (
                                <span
                                  key={r.teamId}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isAssigned
                                      ? "bg-green-500/15 text-green-400 border border-green-500/25"
                                      : "bg-[#1a1a1a] text-gray-400 border border-[#252525]"
                                  }`}
                                >
                                  {r.team.code} · {r.pts}pts
                                  {isAssigned && " ✓"}
                                </span>
                              );
                            })}
                          </div>
                          {rankings.length > 8 && (
                            <p className="px-3 pb-2 text-[10px] text-gray-600">
                              Quedan afuera:{" "}
                              {rankings
                                .filter((r) => !r.qualifies)
                                .map((r) => r.team.code)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Stale picks warning */}
                    {(() => {
                      const staleCount = (BRACKET_MATCHES[currentPhase.key] ?? []).filter((match) => {
                        const key = bracketKey(match.phase, String(match.matchNum));
                        const pick = savedBracket[key];
                        return pick && isBracketPickStale(match.phase, String(match.matchNum), pick, bracketCtx);
                      }).length + (savedBracket["CHAMPION:1"] && isBracketPickStale("CHAMPION", "1", savedBracket["CHAMPION:1"], bracketCtx) ? 1 : 0);
                      if (staleCount === 0) return null;
                      return (
                        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-300 text-xs leading-relaxed">
                            {staleCount} predicción{staleCount > 1 ? "es" : ""} ya no coincide con tu llave actual.
                            Usá <strong className="text-red-200">Cambiar</strong> para corregirlas.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Bracket grid — column layout on wide screens for knockout feel */}
                    {currentPhase.key === "CHAMPION" ? (
                      <ChampionCard
                        allTeams={allTeams}
                        savedBracket={savedBracket}
                        pendingBracket={pendingBracket}
                        onOpenPicker={() => setSelectionModal({ phase: "CHAMPION", slot: "1" })}
                      />
                    ) : (
                      <div className={`grid gap-3 ${
                        currentPhase.slots >= 8
                          ? "grid-cols-1 lg:grid-cols-2"
                          : currentPhase.slots <= 2
                            ? "grid-cols-1 max-w-sm mx-auto"
                            : "grid-cols-1 sm:grid-cols-2"
                      }`}>
                        {(BRACKET_MATCHES[currentPhase.key] ?? []).map((match: BracketMatch, i: number) => {
                          const matchKey = bracketKey(match.phase, String(match.matchNum));
                          const savedId = savedBracket[matchKey] ?? null;
                          const pendingId = pendingBracket[matchKey] ?? null;
                          const pickedId = pendingId ?? savedId;
                          const isInvalid = !!pickedId && isBracketPickStale(match.phase, String(match.matchNum), pickedId, bracketCtx);
                          const isSaved = !!savedId && !pendingId;
                          const isLocked = isSaved && !isInvalid;
                          const pickHint = formatMatchPickHint(match, bracketCtx, matchKey);
                          const winnerOptions = getMatchWinnerOptions(match, bracketCtx, matchKey);
                          const completeness = getBracketMatchCompleteness(match, bracketCtx, matchKey, pickedId);
                          const isPending = completeness.isComplete && !!pendingId;
                          const fieldError = bracketFieldErrors[matchKey];
                          const isStale = !!savedId && isInvalid && !pendingId;
                          const thirdSlot = getThirdSlotPickState(match, pickedId, bracketCtx, matchKey);
                          const pickerEntries = getThirdSlotPickerEntries(match, bracketCtx, matchKey);
                          const isLeftThird = match.leftSource.startsWith("3");
                          const isRightThird = match.rightSource.startsWith("3");
                          const rivalId = thirdSlotAssignments[matchKey] ?? null;
                          const rivalTeam = rivalId ? allTeams.find((t) => t.id === rivalId) ?? null : null;
                          const fixedTeam = thirdSlot?.fixedTeam ?? null;
                          const leftTeam = thirdSlot
                            ? (isLeftThird ? rivalTeam : fixedTeam) as Team | null
                            : resolveBracketSource(match.leftSource, displayBracketCtx) as Team | null;
                          const rightTeam = thirdSlot
                            ? (isRightThird ? rivalTeam : fixedTeam) as Team | null
                            : resolveBracketSource(match.rightSource, displayBracketCtx) as Team | null;
                          return (
                          <BracketMatchCard2
                            key={match.matchNum}
                            match={match}
                            leftTeam={leftTeam}
                            rightTeam={rightTeam}
                            thirdSlot={thirdSlot ? {
                              fixedTeam: thirdSlot.fixedTeam as Team | null,
                              thirdPickedTeam: rivalTeam,
                              entries: pickerEntries.map((e) => ({
                                team: e.team as Team,
                                groupLetter: e.groupLetter,
                                qualifies: e.qualifies,
                              })),
                              fixedPicked: !!(pickedId && fixedTeam && pickedId === fixedTeam.id),
                              thirdSource: thirdSlot.thirdSource,
                            } : null}
                            matchCompleteness={completeness}
                            pickHint={pickHint}
                            winnerOptions={winnerOptions as Team[]}
                            pickedTeamId={pickedId}
                            isLocked={isLocked}
                            isPending={isPending}
                            isStale={isStale || (!!pendingId && isInvalid)}
                            validationError={fieldError}
                            hardcoreMode={hardcoreMode}
                            pendingBracketScore={pendingBracketScores[matchKey]}
                            savedBracketScore={savedBracketScores[matchKey]}
                            onPickBracketScore={(side, value) => handlePickBracketScore(match.phase, match.matchNum, side, value)}
                            onSaveBracketScore={(home, away) => handleSaveBracketMatchScore(match.phase, String(match.matchNum), home, away)}
                            savingBracketScore={savingBracketMatch[matchKey]}
                            delay={i * 0.06}
                            onPick={(teamId) => handlePickBracket(match.phase, String(match.matchNum), teamId)}
                            onAssignThird={(teamId) => handleAssignThirdRival(match.phase, String(match.matchNum), teamId)}
                            changesRemaining={changesRemaining}
                            onUseChange={handleUseChange}
                            usingChange={usingChange}
                          />
                          );
                        })}
                      </div>
                    )}

                    {/* Confirm button */}
                    {currentPhasePendingCount > 0 && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                        <Button variant="primary" size="lg" loading={savingBracket}
                          onClick={handleSaveCurrentPhase} className="w-full text-base font-black py-4"
                          data-save-predictions>
                          <Save className="w-5 h-5" />
                          Confirmar {currentPhasePendingCount} selección{currentPhasePendingCount > 1 ? "es" : ""} en {currentPhase.label}
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      <Footer />

      {/* ── Points & Achievements Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPointsModal && (
          <PointsAndAchievementsModal
            onClose={() => setShowPointsModal(false)}
            savedMatchCount={Object.keys(savedPreds).length}
            savedGroupCount={completedGroupsCount}
            savedBracketCount={Object.keys(savedBracket).length}
            hasChampionPred={Object.keys(savedBracket).some(k => k.startsWith("CHAMPION:"))}
            isHardcore={hardcoreMode}
          />
        )}
      </AnimatePresence>

      {/* ── Team selection modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectionModal && (
          <TeamSelectionModal
            phase={selectionModal.phase}
            slot={selectionModal.slot}
            eligibleTeams={eligibleTeams}
            savedBracket={savedBracket}
            pendingBracket={pendingBracket}
            onSelect={(teamId) => handlePickBracket(selectionModal.phase, selectionModal.slot, teamId)}
            onClose={() => setSelectionModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal: Cambio de predicción ──────────────────────────────────────── */}
      <AnimatePresence>
        {showChangeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              onClick={() => !buyingChange && setShowChangeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-black text-lg">Cambiar predicciones</h2>
                      <p className="text-gray-500 text-xs">Costo: {changeCost} puntos</p>
                    </div>
                  </div>
                  <button onClick={() => !buyingChange && setShowChangeModal(false)} className="text-gray-600 hover:text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                    <p className="text-white text-sm font-semibold mb-2">¿Por qué están bloqueadas?</p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Para mantener la competencia justa, las predicciones se bloquean apenas las confirmás.
                      Esto evita que alguien cambie sus picks después de que los partidos arranquen.
                    </p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-300 text-sm font-semibold mb-1">¿Qué incluye este canje?</p>
                    <ul className="text-amber-500/80 text-xs space-y-1">
                      <li>✓ Obtenés <strong className="text-amber-400">3 créditos</strong> para cambiar predicciones</li>
                      <li>✓ Cada crédito desbloquea <strong className="text-amber-400">una predicción individual</strong></li>
                      <li>✓ Se descuentan <strong className="text-amber-400">{changeCost} puntos</strong> al instante</li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                    <span className="text-gray-400 text-sm">Puntos disponibles</span>
                    <span className={`font-black text-sm ${availablePoints >= changeCost ? "text-yellow-400" : "text-red-400"}`}>
                      {availablePoints} pts
                    </span>
                  </div>
                  {availablePoints < changeCost && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <p className="text-red-400 text-xs font-semibold">Necesitás {changeCost - availablePoints} pts más.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowChangeModal(false); router.push("/prizes"); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-semibold hover:bg-[#1a1a1a] hover:text-white transition-all">
                    <Gift className="w-4 h-4" /> Ver premios
                  </button>
                  <Button variant="primary" size="sm" loading={buyingChange}
                    disabled={availablePoints < changeCost} onClick={handleBuyChange} className="flex-1">
                    {availablePoints < changeCost ? "Sin puntos" : `Obtener 3 créditos (${changeCost} pts)`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Hardcore Spotlight Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showHardcoreSpotlight && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm"
              onClick={() => { localStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-orange-500/40 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative pointer-events-auto">
                <button
                  onClick={() => { localStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
                  className="absolute top-3 right-3 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-8 h-8 text-orange-400" />
                </div>

                <h2 className="text-xl font-black uppercase text-white mb-1">
                  ¿Querés ganar más?
                </h2>
                <p className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-4">
                  Modo Hardcore disponible
                </p>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-5 text-left space-y-2">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    Activando el <strong className="text-orange-400">Modo Hardcore</strong>, en vez de predecir solo el resultado, predecís el <strong className="text-white">marcador exacto</strong>.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Si acertás el marcador, ganás <strong className="text-orange-400">+500 pts extra</strong> por encima del puntaje normal.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      localStorage.setItem("hardcore_spotlight_seen", "1");
                      setShowHardcoreSpotlight(false);
                      await handleToggleHardcore();
                    }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4 h-4" /> Activar Modo Hardcore
                  </button>
                  <button
                    onClick={() => { localStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-300 font-semibold text-sm transition-colors"
                  >
                    No gracias, seguir sin Hardcore
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Onboarding Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }} transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
            >
              <div className="bg-[#111] border border-[#2a2a2a] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92vh] sm:max-h-[88vh]">

                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                  <div className="w-10 h-1 bg-[#333] rounded-full" />
                </div>

                {/* Header */}
                <div className="text-center px-5 pt-3 pb-4 flex-shrink-0">
                  <div className="text-4xl mb-2">⚽</div>
                  <h2 className="text-white font-black text-xl uppercase tracking-wide">¡Bienvenido al Prode!</h2>
                  <p className="text-gray-500 text-sm mt-1">Así se ganan puntos</p>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-4 pb-2">
                  {/* Cards */}
                  <div className="space-y-2 mb-4">
                    {[
                      {
                        icon: "🏟️",
                        title: "Partidos de grupos",
                        rows: [
                          { label: "Acertar ganador o perdedor", pts: "500 pts" },
                          { label: "Acertar empate exacto",       pts: "800 pts" },
                        ],
                        note: "48 partidos en fase de grupos",
                      },
                      {
                        icon: "🥇",
                        title: "Clasificados por grupo",
                        rows: [
                          { label: "Equipo que clasifica",        pts: "1.500 pts" },
                          { label: "Posición exacta (1° o 2°)",   pts: "+500 pts" },
                        ],
                        note: "Máximo 2.000 pts por equipo · 12 grupos",
                      },
                      {
                        icon: "🏆",
                        title: "Eliminatorias",
                        rows: [
                          { label: "Ronda de 32",  pts: "2.000 pts" },
                          { label: "Octavos",      pts: "3.500 pts" },
                          { label: "Cuartos",      pts: "6.000 pts" },
                          { label: "Semifinal",    pts: "10.000 pts" },
                          { label: "Campeón 🏆",   pts: "30.000 pts" },
                        ],
                        note: null,
                      },
                    ].map(item => (
                      <div key={item.title} className="bg-[#1a1a1a] border border-[#252525] rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#252525]">
                          <span className="text-xl leading-none">{item.icon}</span>
                          <p className="text-white font-bold text-sm">{item.title}</p>
                        </div>
                        <div className="px-4 py-2.5 space-y-2">
                          {item.rows.map(row => (
                            <div key={row.label} className="flex items-center justify-between gap-3">
                              <span className="text-gray-400 text-sm">{row.label}</span>
                              <span className="text-yellow-400 font-black text-sm tabular-nums shrink-0">{row.pts}</span>
                            </div>
                          ))}
                          {item.note && (
                            <p className="text-gray-700 text-xs pt-1 border-t border-[#252525]">{item.note}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Logros */}
                    <div className="bg-[#0f1a0f] border border-green-500/15 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl leading-none flex-shrink-0">🎯</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">Logros automáticos</p>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                          Si acertás grupos y bracket, se suman logros con puntos extra (hasta 85.000 pts adicionales).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3 mb-4">
                    <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-300/90 text-sm leading-relaxed">
                      Las predicciones se <strong className="text-amber-300">bloquean al confirmar</strong>.
                      Para cambiarlas canjear un <strong className="text-amber-300">Cambio ({changeCost} pts)</strong>.
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-4 pb-6 pt-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      localStorage.setItem("pred_onboarding_seen", "1");
                      setShowOnboarding(false);
                      if (!hardcoreMode && !localStorage.getItem("hardcore_spotlight_seen")) {
                        setTimeout(() => setShowHardcoreSpotlight(true), 400);
                      }
                    }}
                    className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-base uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/20"
                  >
                    ¡A predecir! ⚽
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Unsaved changes banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {hasUnsaved && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4"
          >
            <div className="max-w-lg mx-auto bg-amber-500 rounded-2xl shadow-2xl shadow-amber-500/30 px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-black flex-shrink-0" />
              <p className="text-black font-bold text-sm flex-1">
                Tenés predicciones sin guardar — confirmá antes de salir
              </p>
              <button
                onClick={() => {
                  const saveBtn = document.querySelector<HTMLButtonElement>("[data-save-predictions]");
                  saveBtn?.click();
                  saveBtn?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="bg-black text-amber-400 font-black text-xs px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap"
              >
                Ir a guardar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unsaved changes navigation modal ───────────────────────────────── */}
      <AnimatePresence>
        {showUnsavedModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setShowUnsavedModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-amber-500/40 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center pointer-events-auto">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-white font-black text-lg mb-2">¡Che, no guardaste!</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Tenés predicciones sin confirmar. Si salís ahora las perdés y no van a contar para el prode.{" "}
                  <span className="text-amber-400 font-semibold">Volvé y tocá Guardar</span> para que cuenten.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowUnsavedModal(false)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl transition-colors text-sm uppercase tracking-wider"
                  >
                    Volver a guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowUnsavedModal(false);
                      if (pendingNavUrl) router.push(pendingNavUrl);
                    }}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-300 font-semibold text-sm transition-colors"
                  >
                    Salir igual (sin guardar)
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Points & Achievements Modal ─────────────────────────────────────────────

const LOGROS = [
  { icon: "🦅", name: "Ojo de águila",   condition: "Acertar el 1° y 2° exacto en al menos 4 grupos (se calcula al cerrar la fase de grupos)", pts: "15.000", target: 4,  type: "groups" as const },
  { icon: "🎯", name: "Bracket de lujo", condition: "Acertar 6 o más de los 8 clasificados a cuartos de final (se calcula al terminar octavos)", pts: "20.000", target: 1,  type: "champion" as const },
  { icon: "🏆", name: "Lo vi venir",     condition: "Acertar al campeón en la predicción del ganador (se calcula al terminar el torneo)",        pts: "50.000", target: 1,  type: "champion" as const },
];

const POINTS_TABLE = [
  { section: "Partidos de grupos", items: [
    { label: "Acertar ganador o perdedor",          pts: "500",    note: "48 partidos en grupos" },
    { label: "Acertar empate exacto",               pts: "800",    note: "(500 + 300 bonus empate)" },
    { label: "🔥 Bonus marcador exacto (Hardcore)", pts: "+500",   note: "se suma al resultado acertado" },
  ]},
  { section: "Clasificados de grupo", items: [
    { label: "Acertar equipo clasificado",          pts: "1.500",  note: "por cada clasificado" },
    { label: "Acertar la posición exacta",          pts: "+500",   note: "extra si acertás 1° o 2° exacto" },
    { label: "Ejemplo: Argentina 1° exacto",        pts: "2.000",  note: "1.500 + 500 = 2.000 pts" },
  ]},
  { section: "Eliminatorias", items: [
    { label: "Equipo que pasa en Ronda de 32",      pts: "2.000",  note: "× 32 equipos" },
    { label: "Equipo que pasa en Octavos",          pts: "3.500",  note: "× 16 equipos" },
    { label: "Equipo que pasa en Cuartos",          pts: "6.000",  note: "× 8 equipos" },
    { label: "Equipo que pasa en Semifinal",        pts: "10.000", note: "× 4 equipos" },
    { label: "Acertar al subcampeón (finalista)",   pts: "15.000", note: "" },
    { label: "Acertar al campeón",                  pts: "30.000", note: "" },
    { label: "Campeón + subcampeón exactos",        pts: "+40.000",note: "bonus adicional" },
  ]},
];

function PointsAndAchievementsModal({
  onClose, savedMatchCount, savedGroupCount, savedBracketCount, hasChampionPred, isHardcore,
}: {
  onClose: () => void;
  savedMatchCount: number;
  savedGroupCount: number;
  savedBracketCount: number;
  hasChampionPred: boolean;
  isHardcore: boolean;
}) {
  const [tab, setTab] = useState<"points" | "logros">("points");

  const getProgress = (logro: typeof LOGROS[0]) => {
    if (logro.type === "groups") return Math.min(savedGroupCount, logro.target) / logro.target;
    if (logro.type === "champion") return hasChampionPred ? 1 : 0;
    return 0;
  };

  const getCurrent = (logro: typeof LOGROS[0]) => {
    if (logro.type === "groups") return Math.min(savedGroupCount, logro.target);
    if (logro.type === "champion") return hasChampionPred ? 1 : 0;
    return 0;
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }} transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
      >
        <div className="bg-[#111] border border-[#2a2a2a] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh] sm:max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e1e1e] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-white font-black text-lg">Puntos y Logros</h2>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 mx-4 mt-4 mb-1 bg-[#1a1a1a] rounded-xl p-1 flex-shrink-0">
            <button onClick={() => setTab("points")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "points" ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              Cuántos puntos gano
            </button>
            <button onClick={() => setTab("logros")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === "logros" ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              Logros ({LOGROS.length})
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-4 pb-6 pt-3">
            {tab === "points" && (
              <div className="space-y-5">
                {POINTS_TABLE.map(section => (
                  <div key={section.section}>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">{section.section}</p>
                    <div className="rounded-xl border border-[#1e1e1e] overflow-hidden">
                      {section.items.map((item, i) => (
                        <div key={item.label} className={`flex items-center justify-between px-4 py-3 gap-3 ${i !== section.items.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-xs font-semibold">{item.label}</p>
                            {item.note && <p className="text-gray-600 text-[10px] mt-0.5">{item.note}</p>}
                          </div>
                          <span className={`font-black text-sm tabular-nums flex-shrink-0 ${item.pts.startsWith("+") ? "text-green-400" : "text-yellow-400"}`}>
                            {item.pts} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="bg-[#0f1a0f] border border-green-500/20 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
                  <span className="text-green-400 font-bold">Ejemplo completo:</span> Argentina clasifica y queda 1° →
                  1.500 pts (clasificado) + 500 pts (posición exacta) = <span className="text-yellow-300 font-bold">2.000 pts</span> solo por ese equipo.
                </div>
              </div>
            )}

            {tab === "logros" && (
              <div className="space-y-3">
                {!isHardcore && (
                  <div className="flex items-start gap-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3.5 py-3">
                    <span className="text-orange-400 text-base leading-none mt-0.5">🔥</span>
                    <div>
                      <p className="text-orange-300 text-xs font-bold">Solo disponibles en Modo Hardcore</p>
                      <p className="text-orange-500/80 text-[11px] mt-0.5 leading-snug">
                        Activá el Modo Hardcore para poder ganar logros. Sin él, los puntos de logros no se acreditan.
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-gray-600 text-[11px] leading-relaxed pb-1">
                  Los logros se calculan automáticamente al cerrar cada fase del torneo.
                </p>
                {LOGROS.map(logro => {
                  const progress = getProgress(logro);
                  const current = getCurrent(logro);
                  // Groups logro: cannot determine client-side if positions are exact — never show as "done"
                  const done = logro.type !== "groups" && progress >= 1;
                  return (
                    <div key={logro.name} className={`p-4 rounded-xl border transition-colors ${done ? "bg-yellow-500/5 border-yellow-500/20" : "bg-[#141414] border-[#1e1e1e]"}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl leading-none mt-0.5">{logro.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-black text-sm ${done ? "text-yellow-300" : "text-white"}`}>{logro.name}</p>
                            {done && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">✓ LISTO</span>}
                          </div>
                          <p className="text-gray-500 text-[11px] mt-0.5 leading-tight">{logro.condition}</p>
                        </div>
                        <span className="text-yellow-400 font-black text-sm tabular-nums flex-shrink-0">{logro.pts}</span>
                      </div>
                      {logro.type === "groups" && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-gray-600">Grupos guardados</span>
                            <span className="text-gray-600">{current}/{logro.target} grupos</span>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-red-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-gray-700 text-[10px] mt-1">El resultado exacto se calcula al cierre de la fase de grupos</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({
  match, saved, pending, hardcoreMode, pendingScore, savedScore, onPick, onPickScore,
  onSaveScore, savingScore,
  changesRemaining, onUseChange, usingChange,
}: {
  match: Match;
  saved?: Outcome;
  pending?: Outcome;
  hardcoreMode: boolean;
  pendingScore?: { home?: number; away?: number };
  savedScore?: { home: number; away: number };
  onPick: (matchId: string, outcome: Outcome) => void;
  onPickScore: (matchId: string, side: "home" | "away", value: number) => void;
  onSaveScore?: (home: number, away: number) => void;
  savingScore?: boolean;
  changesRemaining?: number;
  onUseChange?: (type: "match" | "group" | "bracket", id: string) => void;
  usingChange?: boolean;
}) {
  const isLocked = !!saved;
  const matchStarted = match.status === "live" || match.status === "finished";
  const windowOpen = isMatchPredictionWindowOpen(match.startDate);
  const closedReason = getMatchPredictionClosedReason(match.startDate, match.status);
  const deadlineHint = windowOpen ? getMatchPredictionDeadlineHint(match.startDate) : null;
  const isReadOnly = matchStarted || isLocked || !windowOpen || match.status !== "scheduled";
  const homeName = match.homeTeam?.name || match.homePlaceholder || "TBD";
  const awayName = match.awayTeam?.name || match.awayPlaceholder || "TBD";
  const homeCode = match.homeTeam?.code || "LOC";
  const awayCode = match.awayTeam?.code || "VIS";

  const hasPendingScore = pendingScore?.home !== undefined && pendingScore?.away !== undefined;
  const inferredOutcome = hasPendingScore
    ? pendingScore!.home! > pendingScore!.away! ? "home"
    : pendingScore!.away! > pendingScore!.home! ? "away"
    : "draw"
    : null;

  const pendingColors: Record<Outcome, string> = {
    home: "bg-red-600/30 border-red-500/60 text-red-300",
    draw: "bg-amber-500/30 border-amber-500/60 text-amber-300",
    away: "bg-blue-600/30 border-blue-500/60 text-blue-300",
  };
  const outcomeLabel: Record<Outcome, string> = {
    home: `Gana ${homeCode}`, draw: "Empate", away: `Gana ${awayCode}`,
  };

  const needsHardcoreScore = isLocked && hardcoreMode && !savedScore && windowOpen && !matchStarted;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isLocked && savedScore ? "border-green-500/20 bg-[#0d110d]" :
      needsHardcoreScore && hasPendingScore ? "border-orange-500/30 bg-orange-500/5" :
      needsHardcoreScore ? "border-orange-500/15 bg-[#0f0d0a]" :
      isLocked ? "border-green-500/20 bg-[#0d110d]" :
      (pending || hasPendingScore) ? "border-amber-500/20 bg-amber-500/5" :
      "border-[#1d1d1d] bg-[#141414]"
    }`}>
      {/* Teams row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.homeTeam?.flagUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={match.homeTeam.flagUrl} alt="" className="w-7 h-5 object-cover rounded shadow-md flex-shrink-0" />
            : <div className="w-7 h-5 bg-[#2a2a2a] rounded flex-shrink-0" />
          }
          <span className="text-white text-xs font-bold leading-tight line-clamp-2 break-words">{homeName}</span>
        </div>
        <div className="flex flex-col items-center flex-shrink-0 min-w-[72px]">
          {matchStarted && match.homeScore !== undefined
            ? <span className="text-white font-black text-base">{match.homeScore} – {match.awayScore}</span>
            : <>
                <span className="text-gray-700 text-[9px] uppercase font-bold">vs</span>
                <span className="text-gray-600 text-[9px] text-center leading-tight">{formatDate(match.startDate)}</span>
                {closedReason && !isLocked && (
                  <span className="text-red-400/90 text-[8px] mt-0.5 text-center leading-tight">Cerrado</span>
                )}
              </>
          }
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-white text-xs font-bold leading-tight line-clamp-2 break-words text-right">{awayName}</span>
          {match.awayTeam?.flagUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={match.awayTeam.flagUrl} alt="" className="w-7 h-5 object-cover rounded shadow-md flex-shrink-0" />
            : <div className="w-7 h-5 bg-[#2a2a2a] rounded flex-shrink-0" />
          }
        </div>
      </div>

      {deadlineHint && !isLocked && (
        <p className="px-4 -mt-1 pb-1 text-[10px] text-gray-600 text-center">{deadlineHint}</p>
      )}
      {closedReason && !isLocked && !matchStarted && (
        <p className="px-4 pb-2 text-[10px] text-red-400/80 text-center">{closedReason}</p>
      )}
      {isLocked && (changesRemaining ?? 0) > 0 && onUseChange && (
        <div className="px-4 pb-2 flex justify-end">
          <button
            onClick={() => onUseChange("match", match.id)}
            disabled={usingChange}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50"
          >
            <Gift className="w-3 h-3" /> Cambiar (1 crédito)
          </button>
        </div>
      )}

      {/* ── HARDCORE: score inputs ── */}
      {hardcoreMode ? (
        <div className="px-4 pb-3">
          {isLocked && savedScore ? (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px] font-bold uppercase">{homeCode}</span>
                <div className="w-10 h-9 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-lg">{savedScore.home}</span>
                </div>
              </div>
              <span className="text-gray-700 font-black text-sm">—</span>
              <div className="flex items-center gap-2">
                <div className="w-10 h-9 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-lg">{savedScore.away}</span>
                </div>
                <span className="text-gray-500 text-[10px] font-bold uppercase">{awayCode}</span>
              </div>
              <Lock className="w-3 h-3 text-green-700 ml-1" />
            </div>
          ) : isLocked && !savedScore && windowOpen && !matchStarted ? (
            /* Hardcore upgrade: outcome saved in normal mode, scores not yet added */
            (() => {
              const lockedWinnerLabel = saved === "home" ? homeCode : saved === "away" ? awayCode : "Empate";
              const impliedWinner: Outcome | null = hasPendingScore
                ? (pendingScore!.home! > pendingScore!.away! ? "home"
                  : pendingScore!.away! > pendingScore!.home! ? "away"
                  : "draw")
                : null;
              const wrongWinner = hasPendingScore && impliedWinner !== saved;
              return (
                <>
                  <p className="text-[10px] text-orange-400/80 text-center mb-2 font-semibold">
                    Agregá el marcador — el ganador ({lockedWinnerLabel}) ya está fijo
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[10px] font-bold uppercase">{homeCode}</span>
                      <input
                        type="number" min={0} max={30}
                        value={pendingScore?.home ?? ""}
                        onChange={e => onPickScore(match.id, "home", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                        placeholder="0"
                        className={`w-12 h-10 rounded-lg bg-[#1a1a1a] border text-white text-center font-black text-lg focus:outline-none transition-colors ${wrongWinner ? "border-red-500/60 focus:border-red-500" : "border-orange-500/40 focus:border-orange-500/70"}`}
                      />
                    </div>
                    <span className="text-gray-700 font-black text-sm">—</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} max={30}
                        value={pendingScore?.away ?? ""}
                        onChange={e => onPickScore(match.id, "away", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                        placeholder="0"
                        className={`w-12 h-10 rounded-lg bg-[#1a1a1a] border text-white text-center font-black text-lg focus:outline-none transition-colors ${wrongWinner ? "border-red-500/60 focus:border-red-500" : "border-orange-500/40 focus:border-orange-500/70"}`}
                      />
                      <span className="text-gray-500 text-[10px] font-bold uppercase">{awayCode}</span>
                    </div>
                  </div>
                  {wrongWinner && (
                    <p className="text-red-400 text-[10px] text-center mt-1.5 font-semibold">
                      El marcador cambia el ganador — necesitás que gane {lockedWinnerLabel}
                    </p>
                  )}
                  {hasPendingScore && !wrongWinner && onSaveScore && (
                    <button
                      onClick={() => onSaveScore(pendingScore!.home!, pendingScore!.away!)}
                      disabled={!!savingScore}
                      className="mt-2 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-black text-xs transition-colors"
                    >
                      {savingScore ? "Guardando..." : "Confirmar marcador"}
                    </button>
                  )}
                </>
              );
            })()
          ) : isReadOnly ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-gray-700 text-xs">Sin predicción de marcador</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-[10px] font-bold uppercase">{homeCode}</span>
                  <input
                    type="number" min={0} max={30}
                    value={pendingScore?.home ?? ""}
                    onChange={e => onPickScore(match.id, "home", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-12 h-10 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-center font-black text-lg focus:outline-none focus:border-orange-500/70 transition-colors"
                  />
                </div>
                <span className="text-gray-700 font-black text-sm">—</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={30}
                    value={pendingScore?.away ?? ""}
                    onChange={e => onPickScore(match.id, "away", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-12 h-10 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-center font-black text-lg focus:outline-none focus:border-orange-500/70 transition-colors"
                  />
                  <span className="text-gray-500 text-[10px] font-bold uppercase">{awayCode}</span>
                </div>
              </div>
              {inferredOutcome && (
                <p className={`text-center text-[10px] font-bold mt-1.5 ${
                  inferredOutcome === "draw" ? "text-amber-500/80" :
                  inferredOutcome === "home" ? "text-red-400/80" : "text-blue-400/80"
                }`}>
                  → {outcomeLabel[inferredOutcome]}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── NORMAL: outcome buttons ── */
        <div className="px-4 pb-3 flex gap-1.5">
          {(["home", "draw", "away"] as Outcome[]).map(key => {
            const isSelected = (saved || pending) === key;
            const labels: Record<Outcome, { short: string; label: string }> = {
              home: { short: homeCode, label: "Local" },
              draw: { short: "EMP", label: "Empate" },
              away: { short: awayCode, label: "Visita" },
            };
            const l = labels[key];
            if (isReadOnly) {
              return (
                <div key={key} className={`flex-1 py-2 rounded-lg text-center border ${
                  isSelected ? "bg-green-600/20 border-green-500/40 text-green-400" : "bg-[#111] border-[#1a1a1a] text-gray-800"
                }`}>
                  <span className="block text-[10px] font-black">{l.short}</span>
                  <span className="block text-[8px] uppercase tracking-wider mt-0.5 opacity-75">{l.label}</span>
                  {isSelected && isLocked && <Lock className="w-2 h-2 mx-auto mt-0.5 opacity-50" />}
                </div>
              );
            }
            return (
              <motion.button key={key} whileTap={{ scale: 0.92 }} onClick={() => onPick(match.id, key)}
                className={`flex-1 py-2.5 rounded-lg text-center border transition-all ${
                  pending === key ? pendingColors[key] : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300"
                }`}>
                <span className="block text-xs font-black">{l.short}</span>
                <span className="block text-[8px] uppercase tracking-wider mt-0.5 font-medium opacity-75">{l.label}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Bracket Match Card 2 (connected to group predictions / bracket winners) ──

function BracketMatchCard2({
  match, leftTeam, rightTeam, thirdSlot, pickedTeamId, isLocked, isPending, isStale = false, validationError,
  matchCompleteness, pickHint, winnerOptions = [],
  hardcoreMode, pendingBracketScore, savedBracketScore, onPickBracketScore,
  onSaveBracketScore, savingBracketScore,
  delay, onPick, onAssignThird,
  changesRemaining, onUseChange, usingChange,
}: {
  match: BracketMatch;
  leftTeam: Team | null;
  rightTeam: Team | null;
  thirdSlot: {
    fixedTeam: Team | null;
    thirdPickedTeam: Team | null;
    entries: { team: Team; groupLetter: string; qualifies: boolean }[];
    fixedPicked: boolean;
    thirdSource: string;
  } | null;
  matchCompleteness?: BracketMatchCompleteness;
  pickHint?: string;
  winnerOptions?: Team[];
  pickedTeamId: string | null;
  isLocked: boolean;
  isPending: boolean;
  isStale?: boolean;
  validationError?: string;
  hardcoreMode: boolean;
  pendingBracketScore?: { home?: number; away?: number };
  savedBracketScore?: { home: number; away: number };
  onPickBracketScore: (side: "home" | "away", value: number) => void;
  onSaveBracketScore?: (home: number, away: number) => void;
  savingBracketScore?: boolean;
  delay?: number;
  onPick: (teamId: string) => void;
  onAssignThird?: (teamId: string) => void;
  changesRemaining?: number;
  onUseChange?: (type: "match" | "group" | "bracket", id: string) => void;
  usingChange?: boolean;
}) {
  const [thirdPickMode, setThirdPickMode] = useState<"left" | "right" | null>(null);

  const winnerTeam = pickedTeamId
    ? (leftTeam?.id === pickedTeamId ? leftTeam : rightTeam?.id === pickedTeamId ? rightTeam : null)
    : null;

  const hasError = !!validationError;
  const step = matchCompleteness?.step;
  const statusLabel = hasError
    ? "Tocá para corregir"
    : isStale
      ? "Desactualizado"
      : isLocked
        ? "Guardado"
        : isPending
          ? "Listo para guardar"
          : step === "pick_rival"
            ? "Elegí el 3°"
            : step === "pick_winner"
              ? "Elegí ganador"
              : step === "missing_teams"
                ? "Faltan equipos"
                : null;

  const isLeftThird = match.leftSource.startsWith("3");
  const isRightThird = match.rightSource.startsWith("3");

  const leftPicked = !!(pickedTeamId && leftTeam && pickedTeamId === leftTeam.id);
  const rightPicked = !!(pickedTeamId && rightTeam && pickedTeamId === rightTeam.id);

  const leftThirdEntries = isLeftThird ? (thirdSlot?.entries ?? []) : [];
  const rightThirdEntries = isRightThird ? (thirdSlot?.entries ?? []) : [];
  const leftThirdSource = isLeftThird ? thirdSlot?.thirdSource ?? match.leftSource : match.leftSource;
  const rightThirdSource = isRightThird ? thirdSlot?.thirdSource ?? match.rightSource : match.rightSource;

  const teamsKnown = thirdSlot ? !!thirdSlot.fixedTeam : !!(leftTeam && rightTeam);
  const leftClickable = !isLocked && !isLeftThird && !!leftTeam;
  const rightClickable = !isLocked && !isRightThird && !!rightTeam;
  const hasPendingScore = pendingBracketScore?.home !== undefined && pendingBracketScore?.away !== undefined;

  const matchKey = bracketKey(match.phase, String(match.matchNum));

  function handleSideClick(team: Team | null) {
    if (isLocked || !team) return;
    onPick(team.id);
  }

  function renderWinnerHint(sidePicked: boolean, clickable: boolean) {
    if (isLocked || sidePicked || !clickable) return null;
    return (
      <span className="text-[9px] text-blue-400/80 font-bold uppercase tracking-wider">
        Tocá para que pase
      </span>
    );
  }

  return (
    <motion.div
      id={`bracket-match-${match.matchNum}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        hasError ? "border-red-500/50 bg-red-950/25 ring-1 ring-red-500/30" :
        isStale ? "border-red-500/40 bg-red-950/20" :
        isLocked && savedBracketScore ? "border-green-500/20 bg-gradient-to-br from-[#0d110d] to-[#0a0a0a]" :
        isLocked && hardcoreMode && !savedBracketScore && hasPendingScore ? "border-orange-500/30 bg-orange-500/5" :
        isLocked && hardcoreMode && !savedBracketScore ? "border-orange-500/15 bg-[#0f0d0a]" :
        isLocked ? "border-green-500/30 bg-gradient-to-br from-[#0d110d] to-[#0a0a0a]" :
        isPending ? "border-amber-500/40 bg-amber-500/[0.04]" :
        teamsKnown ? "border-blue-500/20 bg-[#0a0c10]" : "border-[#1e1e1e] bg-[#0d0d0d]"
      }`}>

      {/* Match number badge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <div className={`px-3 py-0.5 border border-t-0 rounded-b-lg ${
          hasError ? "bg-red-950/90 border-red-500/40" :
          isStale ? "bg-red-950/80 border-red-500/30" :
          isLocked ? "bg-green-950/80 border-green-500/30" :
          isPending ? "bg-amber-950/80 border-amber-500/30" :
          "bg-[#111] border-[#252525]"
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-widest ${
            hasError ? "text-red-300" :
            isStale ? "text-red-400" :
            isLocked ? "text-green-400" :
            isPending ? "text-amber-400" :
            "text-gray-700"
          }`}>
            P{match.matchNum}{isStale ? " · revisar" : ""}
          </span>
        </div>
        {statusLabel && (
          <span className={`mt-0.5 px-2 py-px rounded-full text-[8px] font-black uppercase tracking-wider ${
            hasError ? "bg-red-500/20 text-red-300" :
            isLocked ? "bg-green-500/20 text-green-300" :
            "bg-amber-500/20 text-amber-300"
          }`}>
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex items-stretch min-h-[130px] pt-4">
        {/* Left side */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5 px-3 relative">
          {isLeftThird ? (
            <ThirdPickerSide
              source={leftThirdSource}
              candidateEntries={leftThirdEntries}
              pickedTeamId={thirdSlot?.thirdPickedTeam?.id ?? null}
              winnerTeamId={pickedTeamId}
              isOpen={thirdPickMode === "left"}
              isLocked={isLocked}
              onToggle={() => setThirdPickMode(p => p === "left" ? null : "left")}
              onAssignThird={(teamId) => { onAssignThird?.(teamId); setThirdPickMode(null); }}
              onPickWinner={(teamId) => { onPick(teamId); setThirdPickMode(null); }}
            />
          ) : (
            <motion.button
              whileTap={leftClickable ? { scale: 0.96 } : {}}
              onClick={() => handleSideClick(leftTeam)}
              className={`flex flex-col items-center gap-2 w-full ${
                !leftClickable ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] rounded-xl p-1"
              }`}
            >
              {leftTeam ? (
                <>
                  <div className={`relative rounded-lg transition-all ${
                    leftPicked && isPending ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-[#0d0d0d]" :
                    leftPicked && isLocked  ? "ring-2 ring-green-500/40 ring-offset-2 ring-offset-[#0d0d0d]" :
                    leftClickable ? "ring-1 ring-blue-500/20" : ""
                  }`}>
                    {leftTeam.flagUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={leftTeam.flagUrl} alt="" className="w-14 h-10 object-cover rounded-lg shadow-xl" />
                      : <div className="w-14 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border border-[#2a2a2a]">{leftTeam.code}</div>
                    }
                    {leftPicked && isLocked && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-center px-1">
                    <p className={`text-[11px] font-bold leading-tight ${
                      leftPicked && isLocked ? "text-green-300" : leftPicked && isPending ? "text-amber-300" : "text-white"
                    }`}>{leftTeam.name}</p>
                    <p className="text-[9px] text-gray-700 mt-0.5">{getSourceLabel(match.leftSource)}</p>
                    {renderWinnerHint(leftPicked, leftClickable)}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-10 rounded-lg border-2 border-dashed border-[#222] flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 text-[#282828]" />
                  </div>
                  <p className="text-[10px] text-gray-700 font-medium text-center px-1 leading-tight">
                    {match.leftSource.startsWith("W")
                      ? `Ganador de P${match.leftSource.slice(1)}`
                      : getSourceLabel(match.leftSource)}
                  </p>
                  <p className="text-[9px] text-amber-700/70 text-center px-1">Confirmá ese partido antes</p>
                </>
              )}
            </motion.button>
          )}
          {isLocked && leftPicked && (changesRemaining ?? 0) > 0 && onUseChange && (
            <button onClick={() => onUseChange("bracket", matchKey)} disabled={usingChange}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 text-[9px] font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50">
              <Gift className="w-2.5 h-2.5" /> Cambiar
            </button>
          )}
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 w-10 gap-1">
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
          <span className="text-[#282828] text-[10px] font-black tracking-widest">VS</span>
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
        </div>

        {/* Right side */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5 px-3 relative">
          {isRightThird ? (
            <ThirdPickerSide
              source={rightThirdSource}
              candidateEntries={rightThirdEntries}
              pickedTeamId={thirdSlot?.thirdPickedTeam?.id ?? null}
              winnerTeamId={pickedTeamId}
              isOpen={thirdPickMode === "right"}
              isLocked={isLocked}
              onToggle={() => setThirdPickMode(p => p === "right" ? null : "right")}
              onAssignThird={(teamId) => { onAssignThird?.(teamId); setThirdPickMode(null); }}
              onPickWinner={(teamId) => { onPick(teamId); setThirdPickMode(null); }}
            />
          ) : (
            <motion.button
              whileTap={rightClickable ? { scale: 0.96 } : {}}
              onClick={() => handleSideClick(rightTeam)}
              className={`flex flex-col items-center gap-2 w-full ${
                !rightClickable ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] rounded-xl p-1"
              }`}
            >
              {rightTeam ? (
                <>
                  <div className={`relative rounded-lg transition-all ${
                    rightPicked && isPending ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-[#0d0d0d]" :
                    rightPicked && isLocked  ? "ring-2 ring-green-500/40 ring-offset-2 ring-offset-[#0d0d0d]" :
                    rightClickable ? "ring-1 ring-blue-500/20" : ""
                  }`}>
                    {rightTeam.flagUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={rightTeam.flagUrl} alt="" className="w-14 h-10 object-cover rounded-lg shadow-xl" />
                      : <div className="w-14 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border border-[#2a2a2a]">{rightTeam.code}</div>
                    }
                    {rightPicked && isLocked && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-center px-1">
                    <p className={`text-[11px] font-bold leading-tight ${
                      rightPicked && isLocked ? "text-green-300" : rightPicked && isPending ? "text-amber-300" : "text-white"
                    }`}>{rightTeam.name}</p>
                    <p className="text-[9px] text-gray-700 mt-0.5">{getSourceLabel(match.rightSource)}</p>
                    {renderWinnerHint(rightPicked, rightClickable)}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-10 rounded-lg border-2 border-dashed border-[#222] flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 text-[#282828]" />
                  </div>
                  <p className="text-[10px] text-gray-700 font-medium text-center px-1 leading-tight">
                    {match.rightSource.startsWith("W")
                      ? `Ganador de P${match.rightSource.slice(1)}`
                      : getSourceLabel(match.rightSource)}
                  </p>
                  <p className="text-[9px] text-amber-700/70 text-center px-1">Confirmá ese partido antes</p>
                </>
              )}
            </motion.button>
          )}
          {isLocked && rightPicked && (changesRemaining ?? 0) > 0 && onUseChange && (
            <button onClick={() => onUseChange("bracket", matchKey)} disabled={usingChange}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 text-[9px] font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50">
              <Gift className="w-2.5 h-2.5" /> Cambiar
            </button>
          )}
        </div>
      </div>

      {/* Winner indicator / validation */}
      {!isLocked && (validationError || isStale || pickHint) && (
        <div className="px-4 pb-2 flex flex-col items-center gap-1.5">
          {validationError && (
            <p className="text-[10px] text-red-300 font-semibold text-center leading-tight flex items-start gap-1 max-w-md">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
              <span>{validationError}</span>
            </p>
          )}
          {isStale && !validationError && (
            <p className="text-[10px] text-red-400/90 font-semibold text-center leading-tight">
              Esta predicción ya no coincide con tu llave.
            </p>
          )}
          {pickHint && (
            <p className="text-[10px] text-blue-300/90 font-semibold text-center leading-tight max-w-md">
              {pickHint}
            </p>
          )}
          {winnerOptions.length > 0 && (validationError || isStale || matchCompleteness?.step === "pick_winner") && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
              {winnerOptions.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onPick(team.id)}
                  className="px-2.5 py-1 rounded-lg border border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-200 hover:bg-blue-500/20 transition-colors"
                >
                  {team.code}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {winnerTeam && !isLocked && !validationError && (
        <div className="px-4 pb-2 flex justify-center">
          <span className="text-[10px] text-amber-500/80 font-bold">
            Pasa a la siguiente ronda: {winnerTeam.name} · pendiente de guardar
          </span>
        </div>
      )}
      {winnerTeam && isLocked && !validationError && (
        <div className="px-4 pb-2 flex justify-center">
          <span className="text-[10px] text-green-500/70 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pasa: {winnerTeam.name}
          </span>
        </div>
      )}
      {thirdSlot && !thirdSlot.thirdPickedTeam && !isLocked && !validationError && (
        <div className="px-4 pb-2 flex justify-center">
          <span className="text-[10px] text-gray-500 text-center">
            Paso 1: elegí el tercero rival · Paso 2: tocá quién gana
          </span>
        </div>
      )}

      {/* Hardcore score inputs */}
      {hardcoreMode && (leftTeam || rightTeam) && (
        <div className="px-4 pb-3 border-t border-[#191919] mt-0.5 pt-2.5">
          {isLocked && savedBracketScore ? (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                  {leftTeam?.code ?? "LOC"}
                </span>
                <div className="w-9 h-8 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-base">{savedBracketScore.home}</span>
                </div>
              </div>
              <span className="text-gray-700 font-black text-sm">—</span>
              <div className="flex items-center gap-2">
                <div className="w-9 h-8 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-base">{savedBracketScore.away}</span>
                </div>
                <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                  {rightTeam?.code ?? "VIS"}
                </span>
              </div>
              <Lock className="w-3 h-3 text-green-700 ml-1" />
            </div>
          ) : pickedTeamId ? (
            (() => {
              const isScoreUpgrade = isLocked && !savedBracketScore;
              const wrongWinner = isScoreUpgrade && hasPendingScore &&
                pendingBracketScore!.home! !== pendingBracketScore!.away! &&
                !!leftTeam && !!rightTeam && (
                  (pendingBracketScore!.home! > pendingBracketScore!.away! && pickedTeamId !== leftTeam.id) ||
                  (pendingBracketScore!.away! > pendingBracketScore!.home! && pickedTeamId !== rightTeam.id)
                );
              const pickedTeamCode = leftPicked ? leftTeam?.code : rightPicked ? rightTeam?.code : null;
              const inputBorder = wrongWinner
                ? "border-red-500/60 focus:border-red-500"
                : isScoreUpgrade ? "border-orange-500/40 focus:border-orange-500/70" : "border-[#333] focus:border-orange-500/70";
              return (
                <>
                  {isScoreUpgrade ? (
                    <p className="text-[10px] text-orange-400/80 text-center mb-2 font-semibold">
                      Agregá el marcador — el equipo elegido ({pickedTeamCode ?? "—"}) ya está fijo
                    </p>
                  ) : (
                    <p className="text-[9px] text-orange-500/70 font-bold uppercase tracking-widest text-center mb-2">
                      🔥 Marcador del partido
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                        {leftTeam?.code ?? "LOC"}
                      </span>
                      <input
                        type="number" min={0} max={30}
                        value={pendingBracketScore?.home ?? ""}
                        onChange={e => onPickBracketScore("home", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                        placeholder="0"
                        className={`w-11 h-9 rounded-lg bg-[#1a1a1a] border text-white text-center font-black text-base focus:outline-none transition-colors ${inputBorder}`}
                      />
                    </div>
                    <span className="text-gray-700 font-black text-sm">—</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} max={30}
                        value={pendingBracketScore?.away ?? ""}
                        onChange={e => onPickBracketScore("away", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                        placeholder="0"
                        className={`w-11 h-9 rounded-lg bg-[#1a1a1a] border text-white text-center font-black text-base focus:outline-none transition-colors ${inputBorder}`}
                      />
                      <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                        {rightTeam?.code ?? "VIS"}
                      </span>
                    </div>
                  </div>
                  {wrongWinner && (
                    <p className="text-red-400 text-[9px] text-center mt-1.5 font-semibold">
                      El marcador no puede cambiar el ganador — tiene que ganar {pickedTeamCode ?? "el equipo elegido"}
                    </p>
                  )}
                  {hasPendingScore && !wrongWinner && !isScoreUpgrade && (
                    <p className={`text-center text-[9px] font-bold mt-1.5 ${
                      pendingBracketScore!.home! > pendingBracketScore!.away! ? "text-red-400/80" :
                      pendingBracketScore!.away! > pendingBracketScore!.home! ? "text-blue-400/80" :
                      "text-amber-500/80"
                    }`}>
                      → {pendingBracketScore!.home! > pendingBracketScore!.away!
                        ? `Gana ${leftTeam?.code ?? "local"}`
                        : pendingBracketScore!.away! > pendingBracketScore!.home!
                        ? `Gana ${rightTeam?.code ?? "visita"}`
                        : "Empate (sin penales)"}
                    </p>
                  )}
                  {isScoreUpgrade && hasPendingScore && !wrongWinner && onSaveBracketScore && (
                    <button
                      onClick={() => onSaveBracketScore(pendingBracketScore!.home!, pendingBracketScore!.away!)}
                      disabled={!!savingBracketScore}
                      className="mt-2 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-black text-xs transition-colors"
                    >
                      {savingBracketScore ? "Guardando..." : "Confirmar marcador"}
                    </button>
                  )}
                </>
              );
            })()
          ) : (
            <p className="text-[9px] text-gray-800 text-center py-0.5">Elegí el ganador para ingresar el marcador</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Third-place picker side ───────────────────────────────────────────────────

function ThirdPickerOption({
  team, subtitle, pickedTeamId, onPick, muted = false,
}: {
  team: Team;
  subtitle: string;
  pickedTeamId: string | null;
  onPick: (teamId: string) => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={() => onPick(team.id)}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all ${
        pickedTeamId === team.id
          ? "bg-red-600/20 text-white"
          : muted
            ? "text-amber-700/80 hover:bg-[#1e1e1e] hover:text-amber-600"
            : "text-gray-400 hover:bg-[#1e1e1e] hover:text-white"
      }`}
    >
      {team.flagUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={team.flagUrl} alt="" className="w-8 h-[22px] object-cover rounded flex-shrink-0 shadow" />
        : <div className="w-8 h-[22px] bg-[#2a2a2a] rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-600">{team.code}</div>
      }
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold block truncate">{team.name}</span>
        <span className="text-[9px] text-gray-600 block truncate">{subtitle}</span>
      </div>
      {pickedTeamId === team.id && <CheckCircle2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
    </button>
  );
}

function ThirdPickerSide({
  source, candidateEntries, pickedTeamId, winnerTeamId, isOpen, isLocked, onToggle, onAssignThird, onPickWinner,
}: {
  source: string;
  candidateEntries: { team: Team; groupLetter: string; qualifies: boolean }[];
  pickedTeamId: string | null;
  winnerTeamId: string | null;
  isOpen: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onAssignThird: (teamId: string) => void;
  onPickWinner: (teamId: string) => void;
}) {
  const picked = candidateEntries.find((e) => e.team.id === pickedTeamId)?.team ?? null;
  const label = getSourceLabel(source);
  const qualifyingEntries = candidateEntries.filter((e) => e.qualifies);
  const fallbackEntries = candidateEntries.filter((e) => !e.qualifies);
  const groupHint = source.slice(1).split("").join(", ");
  const rivalIsWinner = !!(picked && winnerTeamId === picked.id);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {picked ? (
        <motion.button
          whileTap={!isLocked ? { scale: 0.96 } : {}}
          onClick={() => !isLocked && onPickWinner(picked.id)}
          className={`flex flex-col items-center gap-2 w-full ${
            isLocked ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] rounded-xl p-1"
          }`}
        >
          <div className={`relative rounded-lg ${
            rivalIsWinner && !isLocked ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-[#0d0d0d]" :
            rivalIsWinner && isLocked  ? "ring-2 ring-green-500/40 ring-offset-2 ring-offset-[#0d0d0d]" :
            !isLocked ? "ring-1 ring-blue-500/20" : ""
          }`}>
            {picked.flagUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={picked.flagUrl} alt="" className="w-14 h-10 object-cover rounded-lg shadow-xl" />
              : <div className="w-14 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border border-[#2a2a2a]">{picked.code}</div>
            }
          </div>
          <p className="text-[11px] font-bold text-white leading-tight text-center">{picked.name}</p>
          <p className="text-[9px] text-gray-700 leading-tight text-center">{label}</p>
          {!isLocked && !rivalIsWinner && (
            <span className="text-[9px] text-blue-400/80 font-bold uppercase tracking-wider">Tocá si pasa</span>
          )}
        </motion.button>
      ) : (
        <motion.button
          whileTap={!isLocked ? { scale: 0.96 } : {}}
          onClick={() => !isLocked && onToggle()}
          className={`flex flex-col items-center gap-2 w-full ${
            isLocked ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] rounded-xl p-1"
          }`}
        >
          <div className="w-14 h-10 rounded-lg border-2 border-dashed border-[#333] flex items-center justify-center">
            <ChevronDown className="w-4 h-4 text-[#333]" />
          </div>
          <p className="text-[10px] text-gray-600 font-medium text-center px-1 leading-tight">{label}</p>
          {!isLocked && (
            <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider">Elegir tercero</span>
          )}
        </motion.button>
      )}

      {!isLocked && picked && (
        <button
          type="button"
          onClick={onToggle}
          className="text-[9px] text-gray-600 hover:text-gray-400 underline"
        >
          Cambiar tercero
        </button>
      )}

      {/* Inline candidate picker */}
      {isOpen && !isLocked && candidateEntries.length > 0 && (
        <div className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <p className="px-3 pt-2 pb-1 text-[9px] text-gray-500 leading-tight">
            Paso 1 — ¿Qué tercero juega este cruce? (grupos {groupHint})
          </p>
          {qualifyingEntries.length > 0 && (
            <>
              {qualifyingEntries.length > 0 && fallbackEntries.length > 0 && (
                <p className="px-3 pt-2 pb-1 text-[9px] text-gray-600 uppercase tracking-wider font-bold">
                  Entre los 8 mejores
                </p>
              )}
              {qualifyingEntries.map(({ team, groupLetter }) => (
                <ThirdPickerOption
                  key={team.id}
                  team={team}
                  subtitle={`3° Grupo ${groupLetter}`}
                  pickedTeamId={pickedTeamId}
                  onPick={onAssignThird}
                />
              ))}
            </>
          )}
          {fallbackEntries.length > 0 && (
            <>
              {qualifyingEntries.length > 0 && (
                <div className="border-t border-[#222] mx-2" />
              )}
              <p className="px-3 pt-2 pb-1 text-[9px] text-amber-700/70 uppercase tracking-wider font-bold">
                {qualifyingEntries.length > 0 ? "Otros de este cruce" : "Terceros disponibles"}
              </p>
              {fallbackEntries.map(({ team, groupLetter }) => (
                <ThirdPickerOption
                  key={team.id}
                  team={team}
                  subtitle={`3° Grupo ${groupLetter} · fuera del top 8`}
                  pickedTeamId={pickedTeamId}
                  onPick={onAssignThird}
                  muted
                />
              ))}
            </>
          )}
          <p className="px-3 py-2 text-[9px] text-gray-600 border-t border-[#222]">
            Paso 2 — Después tocá ese tercero o el rival directo para marcar quién pasa.
          </p>
        </div>
      )}
      {isOpen && !isLocked && candidateEntries.length === 0 && (
        <p className="text-[10px] text-amber-700/80 text-center py-1 px-2 leading-tight">
          No hay terceros libres para este cruce. Puede que ya estén asignados en otro partido o falten predicciones de esos grupos.
        </p>
      )}
    </div>
  );
}

// ─── Bracket Match Card (legacy — kept for reference) ─────────────────────────

function BracketMatchCard({
  matchNum, leftSlot, rightSlot, phase, allTeams,
  savedBracket, pendingBracket, hardcoreMode,
  pendingBracketScore, savedBracketScore, onPickBracketScore,
  onOpenSlot, delay = 0,
  changesRemaining, onUseChange, usingChange,
}: {
  matchNum: number; leftSlot: string; rightSlot: string;
  phase: string; allTeams: Team[];
  savedBracket: Record<string, string>; pendingBracket: Record<string, string>;
  hardcoreMode: boolean;
  pendingBracketScore?: { home?: number; away?: number };
  savedBracketScore?: { home: number; away: number };
  onPickBracketScore: (side: "home" | "away", value: number) => void;
  onOpenSlot: (phase: string, slot: string) => void;
  delay?: number;
  changesRemaining?: number;
  onUseChange?: (type: "match" | "group" | "bracket", id: string) => void;
  usingChange?: boolean;
}) {
  const lKey = `${phase}:${leftSlot}`;
  const rKey = `${phase}:${rightSlot}`;
  const leftTeam  = allTeams.find(t => t.id === (savedBracket[lKey] || pendingBracket[lKey]));
  const rightTeam = allTeams.find(t => t.id === (savedBracket[rKey] || pendingBracket[rKey]));
  const leftLocked  = !!savedBracket[lKey];
  const rightLocked = !!savedBracket[rKey];
  const bothLocked  = leftLocked && rightLocked;
  const bothFilled  = !!(savedBracket[lKey] || pendingBracket[lKey]) && !!(savedBracket[rKey] || pendingBracket[rKey]);

  const hasPendingScore = pendingBracketScore?.home !== undefined && pendingBracketScore?.away !== undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        bothLocked ? "border-green-500/20 bg-gradient-to-br from-[#0d110d] to-[#0a0a0a]" :
        bothFilled ? "border-amber-500/15 bg-[#0d0d0d]" : "border-[#1e1e1e] bg-[#0d0d0d]"
      }`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-0.5 bg-[#111] border border-[#252525] border-t-0 rounded-b-lg">
          <span className="text-gray-700 text-[9px] font-bold uppercase tracking-widest">P{matchNum}</span>
        </div>
      </div>
      <div className="flex items-stretch min-h-[130px] pt-4">
        <BracketTeamSide
          team={leftTeam} isLocked={leftLocked} isPending={!!pendingBracket[lKey] && !leftLocked}
          onOpen={() => onOpenSlot(phase, leftSlot)}
          changesRemaining={changesRemaining}
          onUseChange={onUseChange ? () => onUseChange("bracket", lKey) : undefined}
          usingChange={usingChange}
        />
        <div className="flex flex-col items-center justify-center flex-shrink-0 w-10 gap-1">
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
          <span className="text-[#282828] text-[10px] font-black tracking-widest">VS</span>
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
        </div>
        <BracketTeamSide
          team={rightTeam} isLocked={rightLocked} isPending={!!pendingBracket[rKey] && !rightLocked}
          onOpen={() => onOpenSlot(phase, rightSlot)}
          changesRemaining={changesRemaining}
          onUseChange={onUseChange ? () => onUseChange("bracket", rKey) : undefined}
          usingChange={usingChange}
        />
      </div>

      {/* Hardcore score inputs */}
      {hardcoreMode && (
        <div className="px-4 pb-3 border-t border-[#191919] mt-0.5 pt-2.5">
          {bothLocked && savedBracketScore ? (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                  {leftTeam?.code ?? "LOC"}
                </span>
                <div className="w-9 h-8 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-base">{savedBracketScore.home}</span>
                </div>
              </div>
              <span className="text-gray-700 font-black text-sm">—</span>
              <div className="flex items-center gap-2">
                <div className="w-9 h-8 rounded-lg bg-green-600/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-black text-base">{savedBracketScore.away}</span>
                </div>
                <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                  {rightTeam?.code ?? "VIS"}
                </span>
              </div>
              <Lock className="w-3 h-3 text-green-700 ml-1" />
            </div>
          ) : bothFilled ? (
            <>
              <p className="text-[9px] text-orange-500/70 font-bold uppercase tracking-widest text-center mb-2">
                🔥 Marcador del partido
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                    {leftTeam?.code ?? "LOC"}
                  </span>
                  <input
                    type="number" min={0} max={30}
                    value={pendingBracketScore?.home ?? ""}
                    onChange={e => onPickBracketScore("home", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-11 h-9 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-center font-black text-base focus:outline-none focus:border-orange-500/70 transition-colors"
                  />
                </div>
                <span className="text-gray-700 font-black text-sm">—</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={30}
                    value={pendingBracketScore?.away ?? ""}
                    onChange={e => onPickBracketScore("away", Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-11 h-9 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-center font-black text-base focus:outline-none focus:border-orange-500/70 transition-colors"
                  />
                  <span className="text-gray-600 text-[9px] font-bold uppercase truncate max-w-[40px]">
                    {rightTeam?.code ?? "VIS"}
                  </span>
                </div>
              </div>
              {hasPendingScore && (
                <p className={`text-center text-[9px] font-bold mt-1.5 ${
                  pendingBracketScore!.home! > pendingBracketScore!.away! ? "text-red-400/80" :
                  pendingBracketScore!.away! > pendingBracketScore!.home! ? "text-blue-400/80" :
                  "text-amber-500/80"
                }`}>
                  → {pendingBracketScore!.home! > pendingBracketScore!.away!
                    ? `Gana ${leftTeam?.code ?? "local"}`
                    : pendingBracketScore!.away! > pendingBracketScore!.home!
                    ? `Gana ${rightTeam?.code ?? "visita"}`
                    : "Empate (sin penales)"}
                </p>
              )}
            </>
          ) : (
            <p className="text-[9px] text-gray-800 text-center py-0.5">Elegí los equipos para ingresar el marcador</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Bracket Team Side ─────────────────────────────────────────────────────────

function BracketTeamSide({ team, isLocked, isPending, onOpen, changesRemaining, onUseChange, usingChange }: {
  team?: Team; isLocked: boolean; isPending: boolean; onOpen: () => void;
  changesRemaining?: number; onUseChange?: () => void; usingChange?: boolean;
}) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 px-3 transition-all relative`}>
      <motion.button
        whileTap={!isLocked ? { scale: 0.96 } : {}}
        onClick={() => !isLocked && onOpen()}
        className={`flex flex-col items-center gap-2 w-full ${
          isLocked ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] rounded-xl p-1"
        }`}
      >
        {team ? (
          <>
            <div className={`relative rounded-lg transition-all ${
              isPending ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-[#0d0d0d]" :
              isLocked  ? "ring-2 ring-green-500/40 ring-offset-2 ring-offset-[#0d0d0d]" : ""
            }`}>
              {team.flagUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={team.flagUrl} alt="" className="w-14 h-10 object-cover rounded-lg shadow-xl" />
                : <div className="w-14 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border border-[#2a2a2a]">{team.code}</div>
              }
              {isLocked && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>
            <div className="text-center px-1">
              <p className={`text-[11px] font-bold leading-tight ${
                isLocked ? "text-green-300" : isPending ? "text-amber-300" : "text-white"
              }`}>{team.name}</p>
              {isLocked  && <p className="text-[9px] text-green-700 mt-0.5 flex items-center justify-center gap-0.5"><Lock className="w-2 h-2" /> Guardado</p>}
              {isPending && <p className="text-[9px] text-amber-700 mt-0.5">Sin confirmar</p>}
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-10 rounded-lg border-2 border-dashed border-[#222] flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-[#282828]" />
            </div>
            <p className="text-[10px] text-gray-800 font-medium">Elegir</p>
          </>
        )}
      </motion.button>
      {isLocked && (changesRemaining ?? 0) > 0 && onUseChange && (
        <button
          onClick={onUseChange}
          disabled={usingChange}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 text-[9px] font-semibold hover:bg-amber-500/10 transition-colors disabled:opacity-50"
        >
          <Gift className="w-2.5 h-2.5" /> Cambiar
        </button>
      )}
    </div>
  );
}

// ─── Champion Card ────────────────────────────────────────────────────────────

function ChampionCard({ allTeams, savedBracket, pendingBracket, onOpenPicker }: {
  allTeams: Team[];
  savedBracket: Record<string, string>;
  pendingBracket: Record<string, string>;
  onOpenPicker: () => void;
}) {
  const savedId   = savedBracket["CHAMPION:1"];
  const pendingId = pendingBracket["CHAMPION:1"];
  const isLocked  = !!savedId;
  const champion  = allTeams.find(t => t.id === (savedId || pendingId));

  return (
    <div className="relative overflow-hidden bg-[#0d0d00] border border-yellow-600/25 rounded-3xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
      <div className="absolute top-0 right-0 w-56 h-56 bg-yellow-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-600/6 rounded-full blur-2xl pointer-events-none" />

      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="text-5xl mb-4 relative z-10 select-none">🏆</motion.div>
      <h3 className="text-yellow-400 font-black text-xl uppercase tracking-[0.12em] mb-1 relative z-10">Campeón del Mundo</h3>
      <p className="text-gray-700 text-xs mb-8 relative z-10">Copa del Mundo 2026</p>

      <div className="relative z-10">
        {champion ? (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.3 }} className="flex flex-col items-center gap-3">
            <div className={`relative p-4 rounded-2xl ${isLocked ? "bg-yellow-500/15 border border-yellow-500/40" : "bg-amber-500/10 border border-amber-500/30"}`}>
              {champion.flagUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={champion.flagUrl} alt="" className="w-28 h-20 object-cover rounded-xl shadow-2xl"
                    style={{ filter: isLocked ? "drop-shadow(0 0 20px rgba(234,179,8,0.35))" : "none" }} />
                : <div className="w-28 h-20 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-xl font-black text-gray-500">{champion.code}</div>
              }
              {isLocked && (
                <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring" }}
                  className="absolute -top-3 -right-3 w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/40">
                  <Trophy className="w-4 h-4 text-[#111]" />
                </motion.div>
              )}
            </div>
            <div>
              <p className={`font-black text-2xl ${isLocked ? "text-yellow-300" : "text-amber-300"}`}>{champion.name}</p>
              {isLocked
                ? <p className="text-green-500 text-xs font-semibold flex items-center justify-center gap-1 mt-1.5"><Lock className="w-3 h-3" /> Confirmado</p>
                : <>
                    <p className="text-amber-600 text-xs mt-1">Sin confirmar</p>
                    <button onClick={onOpenPicker} className="text-xs text-gray-600 hover:text-gray-400 underline transition-colors mt-2">Cambiar selección</button>
                  </>
              }
            </div>
          </motion.div>
        ) : (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenPicker}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-[#252525] hover:border-yellow-600/40 hover:bg-yellow-500/5 transition-all cursor-pointer">
            <div className="w-28 h-20 bg-[#1a1a1a] rounded-xl border border-[#252525] group-hover:border-yellow-600/30 flex items-center justify-center transition-colors">
              <ChevronDown className="w-6 h-6 text-[#282828] group-hover:text-yellow-800 transition-colors" />
            </div>
            <div>
              <p className="text-gray-600 font-bold text-sm group-hover:text-gray-300 transition-colors">Elegir campeón</p>
              <p className="text-gray-800 text-xs mt-0.5">Tocá para seleccionar</p>
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── Team Selection Modal (bottom-sheet on mobile) ────────────────────────────

function TeamSelectionModal({ phase, slot, eligibleTeams, savedBracket, pendingBracket, onSelect, onClose }: {
  phase: string; slot: string;
  eligibleTeams: Team[];
  savedBracket: Record<string, string>; pendingBracket: Record<string, string>;
  onSelect: (teamId: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const phaseLabel = ELIMINATORIAS_PHASES.find(p => p.key === phase)?.fullLabel ?? phase;
  const currentId  = savedBracket[`${phase}:${slot}`] || pendingBracket[`${phase}:${slot}`];
  const isChampion = phase === "CHAMPION";
  const filtered   = eligibleTeams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 z-[60] backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-x-0 bottom-0 z-[60] sm:inset-0 sm:flex sm:items-end sm:justify-center sm:pb-8 sm:px-4"
        style={{ pointerEvents: "none" }}
      >
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md flex flex-col"
          style={{ maxHeight: "88vh", pointerEvents: "auto" }}>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-[#1e1e1e]">
            <div>
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
                {isChampion ? "Copa del Mundo" : phaseLabel}
              </p>
              <p className="text-white font-black text-lg leading-tight">
                {isChampion ? "¿Quién será el Campeón?" : `Elegí un equipo`}
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#1e1e1e] flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#252525] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-3">
              <Search className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <input autoFocus type="text" placeholder="Buscar equipo..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-700 outline-none min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Count hint */}
          <p className="px-4 pb-2 text-[10px] text-gray-700 font-semibold flex-shrink-0">
            {filtered.length} equipo{filtered.length !== 1 ? "s" : ""}
            {eligibleTeams.length < 48 ? ` (solo los que clasificaron de la ronda anterior)` : ""}
          </p>

          {/* Team list */}
          <div className="overflow-y-auto flex-1 px-3 pb-6">
            {filtered.map((team, i) => {
              const isSelected = currentId === team.id;
              return (
                <motion.button key={team.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSelect(team.id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl mb-1.5 transition-all ${
                    isSelected
                      ? isChampion
                        ? "bg-yellow-500/15 border border-yellow-500/30 text-white"
                        : "bg-red-600/20 border border-red-500/30 text-white"
                      : "bg-[#1a1a1a] border border-transparent text-gray-300 hover:bg-[#1f1f1f] hover:text-white active:bg-[#252525]"
                  }`}
                >
                  {team.flagUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={team.flagUrl} alt="" className="w-10 h-7 object-cover rounded-lg flex-shrink-0 shadow-md" />
                    : <div className="w-10 h-7 bg-[#2a2a2a] rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-600">{team.code}</div>
                  }
                  <span className="font-bold text-sm flex-1 text-left">{team.name}</span>
                  {isSelected && <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isChampion ? "text-yellow-400" : "text-red-400"}`} />}
                </motion.button>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-700">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm">Sin resultados para &ldquo;{search}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
