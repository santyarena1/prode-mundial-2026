"use client";

import { useEffect, useState, useCallback } from "react";
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
  { icon: "🏅", title: "Posiciones de grupos", desc: "En 'Grupos' predecís qué equipos salen 1°, 2° y 3° en cada uno de los 12 grupos del Mundial 2026. ¡Más difícil, más puntos!" },
  { icon: "🏆", title: "Eliminatorias y campeón", desc: "En 'Eliminatorias' predecís quién avanza ronda a ronda hasta el campeón. Estas predicciones se bloquean cuando arranca el torneo." },
  { icon: "🔥", title: "Modo Hardcore", desc: "Activando Hardcore tenés que acertar el marcador exacto de cada partido. Si acertás, ganás puntos extra además de los normales." },
  { icon: "💾", title: "Guardá tus predicciones", desc: "El botón de guardar aparece cuando tenés cambios pendientes. No te olvides de guardar antes de salir, ¡o perdés tus selecciones!" },
];
import {
  getMatchPredictionClosedReason,
  getMatchPredictionDeadlineHint,
  isMatchPredictionWindowOpen,
} from "@/lib/match-utils";

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

const ELIMINATORIAS_PHASES = [
  { key: "ROUND_OF_32",    label: "16vos", fullLabel: "Ronda de 32",      slots: 16, icon: "⚽", pts: 700,   ptsLabel: "700 pts c/u" },
  { key: "ROUND_OF_16",    label: "8vos",  fullLabel: "Octavos de Final",  slots: 8,  icon: "🔥", pts: 1200,  ptsLabel: "1.200 pts c/u" },
  { key: "QUARTER_FINALS", label: "4tos",  fullLabel: "Cuartos de Final",  slots: 4,  icon: "⚡", pts: 2000,  ptsLabel: "2.000 pts c/u" },
  { key: "SEMI_FINALS",    label: "Semis", fullLabel: "Semifinales",        slots: 2,  icon: "🌟", pts: 3500,  ptsLabel: "3.500 pts c/u" },
  { key: "CHAMPION",       label: "Final", fullLabel: "Campeón del Mundo", slots: 1,  icon: "🏆", pts: 10000, ptsLabel: "10.000 / 5.000 pts" },
];

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
  const [savedGroupPreds, setSavedGroupPreds] = useState<Record<string, { first?: string; second?: string }>>({});
  const [savedBracket, setSavedBracket] = useState<Record<string, string>>({});

  const [pendingPreds, setPendingPreds] = useState<Record<string, Outcome>>({});
  const [pendingGroupPreds, setPendingGroupPreds] = useState<Record<string, { first?: string; second?: string }>>({});
  const [pendingBracket, setPendingBracket] = useState<Record<string, string>>({});

  const [savingGroup, setSavingGroup] = useState<Record<string, boolean>>({});
  const [savingBracket, setSavingBracket] = useState(false);

  const [activeTab, setActiveTab] = useState<"matches" | "groups" | "eliminatorias">("matches");
  const [activeElimTab, setActiveElimTab] = useState(ELIMINATORIAS_PHASES[0].key);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [changeCost, setChangeCost] = useState(800);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [buyingChange, setBuyingChange] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const [hardcoreMode, setHardcoreMode] = useState(false);
  const [togglingHardcore, setTogglingHardcore] = useState(false);
  const [pendingScores, setPendingScores] = useState<Record<string, { home?: number; away?: number }>>({});
  const [savedScores, setSavedScores] = useState<Record<string, { home: number; away: number }>>({});
  const [showHardcoreSpotlight, setShowHardcoreSpotlight] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  // Team selection modal for bracket picks
  const [selectionModal, setSelectionModal] = useState<{ phase: string; slot: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) { router.replace("/login"); return; }
      const meData = await meRes.json();
      if (meData.user?.hardcoreMode) setHardcoreMode(true);

      const [groupsRes, predRes, groupPredRes, bracketRes, changeRes] = await Promise.all([
        fetch("/api/public/groups"),
        apiFetch("/api/participant/predictions"),
        apiFetch("/api/participant/group-predictions"),
        apiFetch("/api/participant/bracket-predictions"),
        apiFetch("/api/participant/prediction-change"),
      ]);

      let sp: Record<string, Outcome> = {};
      let sg: Record<string, { first?: string; second?: string }> = {};
      let sb: Record<string, string> = {};

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
          if (p.predictedOutcome && p.status === "locked") sp[p.matchId] = p.predictedOutcome;
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
          if (p.isLocked) sg[p.groupId] = { first: p.firstTeamId || undefined, second: p.secondTeamId || undefined };
        setSavedGroupPreds(sg);
      }

      if (bracketRes.ok) {
        const data = await bracketRes.json();
        for (const p of data.bracketPredictions || [])
          if (p.predictedTeamId && p.isLocked) sb[`${p.phase}:${p.matchSlot}`] = p.predictedTeamId;
        setSavedBracket(sb);
      }

      if (changeRes.ok) {
        const data = await changeRes.json();
        setChangeCost(data.cost);
        setAvailablePoints(data.available);
      }

      const hasSeenOnboarding = typeof window !== "undefined" && sessionStorage.getItem("pred_onboarding_seen");
      const hasSeenHardcoreSpotlight = typeof window !== "undefined" && sessionStorage.getItem("hardcore_spotlight_seen");
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isPhaseUnlocked = useCallback((phaseKey: string): boolean => {
    const idx = ELIMINATORIAS_PHASES.findIndex(p => p.key === phaseKey);
    if (idx === 0) {
      // 16vos requires ALL groups to have confirmed 1st + 2nd place
      return groups.length > 0 && Object.keys(savedGroupPreds).length >= groups.length;
    }
    const prev = ELIMINATORIAS_PHASES[idx - 1];
    return Object.keys(savedBracket).filter(k => k.startsWith(`${prev.key}:`)).length >= prev.slots;
  }, [savedBracket, savedGroupPreds, groups]);

  const getEligibleTeams = useCallback((phaseKey: string): Team[] => {
    const idx = ELIMINATORIAS_PHASES.findIndex(p => p.key === phaseKey);
    // Round of 32: any of the 48 teams can appear (includes 8 best thirds)
    if (idx === 0) return allTeams;
    const prev = ELIMINATORIAS_PHASES[idx - 1];
    const prevIds = Object.entries(savedBracket)
      .filter(([k]) => k.startsWith(`${prev.key}:`))
      .map(([, v]) => v);
    return allTeams.filter(t => prevIds.includes(t.id));
  }, [savedBracket, allTeams]);

  // ── Handlers ───────────────────────────────────────────────────────────────

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
            const outcome = score.home > score.away ? "home" : score.away > score.home ? "away" : "draw";
            setSavedPreds(prev => ({ ...prev, [match.id]: outcome as Outcome }));
            setSavedScores(prev => ({ ...prev, [match.id]: { home: score.home!, away: score.away! } }));
            setPendingScores(prev => { const n = { ...prev }; delete n[match.id]; return n; });
            ok++;
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
            setSavedPreds(prev => ({ ...prev, [match.id]: outcome }));
            setPendingPreds(prev => { const n = { ...prev }; delete n[match.id]; return n; });
            ok++;
          } else { const d = await res.json(); toast.error(d.error || "Error"); }
        } catch { toast.error("Error de conexión"); }
      }
    }
    if (ok > 0) {
      toast.success(`${ok} predicción${ok > 1 ? "es" : ""} confirmada${ok > 1 ? "s" : ""} ✓`);
    }
    setSavingGroup(prev => ({ ...prev, [groupId]: false }));
  }, [pendingPreds, pendingScores, savedPreds, hardcoreMode]);

  const handleToggleGroupTeam = useCallback((groupId: string, teamId: string) => {
    if (savedGroupPreds[groupId]) return;
    setPendingGroupPreds(prev => {
      const cur = prev[groupId] || {};
      if (cur.first === teamId) return { ...prev, [groupId]: { ...cur, first: undefined } };
      if (cur.second === teamId) return { ...prev, [groupId]: { ...cur, second: undefined } };
      if (!cur.first) return { ...prev, [groupId]: { ...cur, first: teamId } };
      return { ...prev, [groupId]: { ...cur, second: teamId } };
    });
  }, [savedGroupPreds]);

  const handleSaveGroupClassification = useCallback(async (groupId: string) => {
    const pending = pendingGroupPreds[groupId];
    if (!pending?.first || !pending?.second) return;
    if (savedGroupPreds[groupId]) return;
    setSavingGroup(prev => ({ ...prev, [`g_${groupId}`]: true }));
    try {
      const res = await apiFetch("/api/participant/group-predictions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, firstTeamId: pending.first, secondTeamId: pending.second }),
      });
      if (res.ok) {
        setSavedGroupPreds(prev => ({ ...prev, [groupId]: pending }));
        setPendingGroupPreds(prev => { const n = { ...prev }; delete n[groupId]; return n; });
        toast.success("Clasificados confirmados ✓");
      } else { const d = await res.json(); toast.error(d.error || "Error"); }
    } catch { toast.error("Error de conexión"); }
    finally { setSavingGroup(prev => ({ ...prev, [`g_${groupId}`]: false })); }
  }, [pendingGroupPreds, savedGroupPreds]);

  const handlePickBracket = useCallback((phase: string, slot: string, teamId: string) => {
    const key = `${phase}:${slot}`;
    if (savedBracket[key]) return;
    setPendingBracket(prev => ({ ...prev, [key]: teamId }));
  }, [savedBracket]);

  const handleSaveCurrentPhase = useCallback(async () => {
    const phasePending = Object.entries(pendingBracket).filter(([k]) => k.startsWith(`${activeElimTab}:`));
    if (phasePending.length === 0) return;
    setSavingBracket(true);
    let ok = 0;
    for (const [key, teamId] of phasePending) {
      if (savedBracket[key]) continue;
      const [phase, slot] = key.split(":");
      try {
        const res = await apiFetch("/api/participant/bracket-predictions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase, matchSlot: slot, predictedTeamId: teamId }),
        });
        if (res.ok) {
          setSavedBracket(prev => ({ ...prev, [key]: teamId }));
          setPendingBracket(prev => { const n = { ...prev }; delete n[key]; return n; });
          ok++;
        } else { const d = await res.json(); toast.error(d.error || "Error"); }
      } catch { toast.error("Error de conexión"); }
    }
    if (ok > 0) toast.success(`${ok} selección${ok > 1 ? "es" : ""} confirmada${ok > 1 ? "s" : ""} ✓`);
    setSavingBracket(false);
  }, [pendingBracket, savedBracket, activeElimTab]);

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
    if (savedPreds[matchId]) return;
    setPendingScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }));
  }, [savedPreds]);

  const handleBuyChange = useCallback(async () => {
    setBuyingChange(true);
    try {
      const res = await apiFetch("/api/participant/prediction-change", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      toast.success(data.message);
      setSavedPreds({}); setSavedGroupPreds({}); setSavedBracket({});
      setAvailablePoints(p => p - changeCost);
      setShowChangeModal(false);
    } catch { toast.error("Error de conexión"); }
    finally { setBuyingChange(false); }
  }, [changeCost]);

  // Unsaved changes detection
  const hasUnsaved =
    Object.keys(pendingPreds).length > 0 ||
    Object.keys(pendingBracket).length > 0 ||
    Object.values(pendingGroupPreds).some((g) => g.first || g.second) ||
    Object.values(pendingScores).some((s) => s.home !== undefined || s.away !== undefined);

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

  const hasAnyLocked =
    Object.keys(savedPreds).length > 0 ||
    Object.keys(savedGroupPreds).length > 0 ||
    Object.keys(savedBracket).length > 0;

  const currentPhase = ELIMINATORIAS_PHASES.find(p => p.key === activeElimTab)!;
  const currentPhasePendingCount = Object.keys(pendingBracket).filter(k => k.startsWith(`${activeElimTab}:`)).length;
  const savedInPhase = Object.keys(savedBracket).filter(k => k.startsWith(`${activeElimTab}:`)).length;
  const currentPhaseUnlocked = isPhaseUnlocked(activeElimTab);

  // Ensure active elim tab is always an unlocked phase
  const eligibleTeams = selectionModal ? getEligibleTeams(selectionModal.phase) : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase text-white">
              Mis <span className="text-red-500">Predicciones</span>
            </h1>
            <p className="text-gray-500 mt-1">Predecí resultados, clasificados y campeón</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <GuidedTour steps={PREDICTIONS_TOUR} storageKey="predictions_tour" />
            <button
              onClick={handleToggleHardcore}
              disabled={togglingHardcore}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                hardcoreMode
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hardcoreMode ? "Hardcore: ON" : "Activar modo hardcore"}</span>
              <span className="sm:hidden">{hardcoreMode ? "HC: ON" : "Hardcore"}</span>
            </button>
            <button
              onClick={() => setShowPointsModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Puntos y logros</span>
              <span className="sm:hidden">Pts</span>
            </button>
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
                Predecí el marcador exacto de cada partido. Si acertás, sumás <span className="text-orange-300 font-bold">+150 pts extra</span> por encima del resultado.
              </p>
            </div>
          </motion.div>
        )}

        {/* Disclaimer */}
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-sm font-bold">⚠️ Una vez confirmada, tu predicción queda bloqueada</p>
            <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">
              No podrás cambiarla después de confirmar. Para modificarla necesitás canjear un{" "}
              <span className="text-amber-400 font-semibold">Cambio de predicción ({changeCost} pts)</span>.
            </p>
          </div>
          {hasAnyLocked && (
            <button
              onClick={() => setShowChangeModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-colors"
            >
              <Gift className="w-3.5 h-3.5" /> Cambiar
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
                    <p className="text-yellow-400 font-black text-sm">150 pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <span className="text-lg leading-none">🤝</span>
                  <div>
                    <p className="text-white font-bold text-xs">Empate exacto</p>
                    <p className="text-yellow-400 font-black text-sm">250 pts</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-[10px] mt-2 leading-relaxed">
                El empate suma 250 pts (150 base + 100 bonus). Hay 48 partidos en fase de grupos.
                {hardcoreMode && <span className="text-orange-700"> · Modo Hardcore: +150 pts extra por marcador exacto.</span>}
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
                              />
                            </motion.div>
                          ))}
                          {pendingCount > 0 && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                              <Button variant="primary" size="sm" loading={savingGroup[group.id]}
                                onClick={() => handleSaveGroupMatches(group.id, group.matches)} className="w-full"
                                data-save-predictions>
                                <Save className="w-4 h-4" />
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
            {/* Points info */}
            <div className="bg-[#0f1a0f] border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-xs font-black uppercase tracking-widest mb-3">¿Cuántos puntos ganás?</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <span className="text-lg leading-none">✅</span>
                  <div>
                    <p className="text-white font-bold text-xs">Equipo clasificado</p>
                    <p className="text-yellow-400 font-black text-sm">400 pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2">
                  <span className="text-lg leading-none">🥇</span>
                  <div>
                    <p className="text-white font-bold text-xs">Posición exacta</p>
                    <p className="text-yellow-400 font-black text-sm">+600 pts</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#161616] border border-[#222] rounded-xl p-4">
              <p className="text-white text-sm font-bold mb-1">¿Cómo funciona?</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Predecí el <span className="text-yellow-400 font-semibold">1°</span> y <span className="text-gray-200 font-semibold">2°</span> de cada grupo.
                Necesitás completar todos los grupos para desbloquear la fase eliminatoria.
                En 2026 hay 12 grupos: clasifican los 2 primeros de cada grupo (24) + los 8 mejores terceros.
              </p>
            </div>

            {groups.map(group => {
              const saved = savedGroupPreds[group.id];
              const pending = pendingGroupPreds[group.id] || {};
              const isLocked = !!saved;
              const firstId  = isLocked ? saved?.first  : pending.first;
              const secondId = isLocked ? saved?.second : pending.second;
              const firstTeam  = group.teams.find(t => t.id === firstId);
              const secondTeam = group.teams.find(t => t.id === secondId);
              const hasBothPending = !isLocked && pending.first && pending.second;

              return (
                <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border overflow-hidden ${isLocked ? "border-green-500/20" : "border-[#222]"}`}>

                  {/* Header */}
                  <div className={`px-5 py-4 flex items-center gap-3 ${isLocked ? "bg-[#0d110d]" : "bg-[#111]"}`}>
                    <span className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {group.name}
                    </span>
                    <div>
                      <h3 className="text-white font-bold">Grupo {group.name}</h3>
                      <p className="text-gray-600 text-xs">{group.teams.map(t => t.name).join(" · ")}</p>
                    </div>
                    {isLocked && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-semibold">
                        <Lock className="w-3 h-3" /> Confirmado
                      </span>
                    )}
                  </div>

                  <div className={`p-4 space-y-4 ${isLocked ? "bg-[#0d110d]" : "bg-[#0f0f0f]"}`}>
                    {/* Podium slots */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "1° Lugar", emoji: "🥇", team: firstTeam, color: "yellow" },
                        { label: "2° Lugar", emoji: "🥈", team: secondTeam, color: "gray" },
                      ].map(slot => (
                        <div key={slot.label} className={`flex flex-col items-center p-3 rounded-xl border gap-1.5 text-center min-h-[110px] justify-center transition-all ${
                          slot.team
                            ? slot.color === "yellow" ? "bg-yellow-500/10 border-yellow-500/30"
                            : "bg-[#1e1e1e] border-gray-500/30"
                            : "bg-[#161616] border-dashed border-[#262626]"
                        }`}>
                          <span className="text-xl leading-none">{slot.emoji}</span>
                          <p className={`text-[9px] font-black uppercase tracking-wider ${
                            slot.team
                              ? slot.color === "yellow" ? "text-yellow-400" : "text-gray-400"
                              : "text-gray-700"
                          }`}>
                            {slot.label}
                          </p>
                          {slot.team ? (
                            <>
                              {slot.team.flagUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={slot.team.flagUrl} alt="" className="w-9 h-6 object-cover rounded shadow-lg" />
                              )}
                              <p className={`font-bold text-[10px] leading-tight ${
                                slot.color === "yellow" ? "text-yellow-200" : "text-gray-200"
                              }`}>
                                {slot.team.name}
                              </p>
                              {isLocked && <Lock className={`w-2.5 h-2.5 opacity-30 ${slot.color === "yellow" ? "text-yellow-400" : "text-gray-400"}`} />}
                            </>
                          ) : (
                            <div className="w-9 h-6 rounded border-2 border-dashed border-[#262626] flex items-center justify-center">
                              <span className="text-gray-800 text-[10px] font-bold">?</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Team selection — only when not locked */}
                    {!isLocked && (
                      <div className="space-y-2">
                        <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest">
                          {!firstId ? "Tocá un equipo para el 1° lugar" :
                           !secondId ? "Elegí el 2° lugar" :
                           "Tocá para cambiar"}
                        </p>
                        {group.teams.map(team => {
                          const isFirst  = pending.first  === team.id;
                          const isSecond = pending.second === team.id;
                          return (
                            <motion.button key={team.id} whileTap={{ scale: 0.97 }}
                              onClick={() => handleToggleGroupTeam(group.id, team.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                                isFirst  ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-200" :
                                isSecond ? "bg-[#1e1e1e] border-gray-500/30 text-gray-200" :
                                "bg-[#141414] border-[#222] text-gray-400 hover:border-[#333] hover:text-gray-200 active:scale-[0.98]"
                              }`}
                            >
                              {team.flagUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={team.flagUrl} alt="" className="w-8 h-5 object-cover rounded flex-shrink-0 shadow" />
                              )}
                              <span className="font-semibold text-sm flex-1 text-left">{team.name}</span>
                              {isFirst  && <span className="text-sm font-black text-yellow-400 flex-shrink-0">🥇 1°</span>}
                              {isSecond && <span className="text-sm font-black text-gray-300 flex-shrink-0">🥈 2°</span>}
                              {!isFirst && !isSecond && (
                                <span className="text-[10px] text-gray-700 font-semibold flex-shrink-0">
                                  {!firstId ? "→ 1°" : "→ 2°"}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {hasBothPending && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        <Button variant="primary" size="sm" loading={savingGroup[`g_${group.id}`]}
                          onClick={() => handleSaveGroupClassification(group.id)} className="w-full"
                          data-save-predictions>
                          <Save className="w-4 h-4" />
                          Confirmar clasificados Grupo {group.name}
                        </Button>
                      </motion.div>
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
                    {activeElimTab === "ROUND_OF_32" ? (
                      <>
                        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                          Primero tenés que confirmar los{" "}
                          <span className="text-white font-semibold">clasificados 1° y 2° de los {groups.length} grupos</span>.
                        </p>
                        <p className="text-gray-700 text-xs mt-2">
                          Completados: {Object.keys(savedGroupPreds).length}/{groups.length} grupos
                        </p>
                        <button
                          onClick={() => setActiveTab("groups")}
                          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          Ir a Grupos →
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                        Primero tenés que completar y confirmar todas las selecciones de{" "}
                        <span className="text-white font-semibold">
                          {ELIMINATORIAS_PHASES[ELIMINATORIAS_PHASES.findIndex(p => p.key === activeElimTab) - 1]?.fullLabel}
                        </span>.
                      </p>
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
                            ? "Campeón: 10.000 pts · Subcampeón: 5.000 pts · Ambos exactos: +15.000 pts"
                            : `${savedInPhase} de ${currentPhase.slots} equipos guardados`}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {currentPhase.key !== "CHAMPION" && (
                      <div className="mb-5 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(savedInPhase / currentPhase.slots) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }} />
                      </div>
                    )}

                    {/* Champion card */}
                    {currentPhase.key === "CHAMPION" ? (
                      <ChampionCard
                        allTeams={allTeams}
                        savedBracket={savedBracket}
                        pendingBracket={pendingBracket}
                        onOpenPicker={() => setSelectionModal({ phase: "CHAMPION", slot: "1" })}
                      />
                    ) : (
                      <div className={`grid gap-3 ${currentPhase.slots <= 2 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {Array.from({ length: Math.ceil(currentPhase.slots / 2) }, (_, i) => (
                          <BracketMatchCard
                            key={i}
                            matchNum={i + 1}
                            leftSlot={`${i * 2 + 1}`}
                            rightSlot={`${i * 2 + 2}`}
                            phase={currentPhase.key}
                            allTeams={allTeams}
                            savedBracket={savedBracket}
                            pendingBracket={pendingBracket}
                            delay={i * 0.06}
                            onOpenSlot={(phase, slot) => setSelectionModal({ phase, slot })}
                          />
                        ))}
                      </div>
                    )}

                    {/* Confirm button */}
                    {currentPhasePendingCount > 0 && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                        <Button variant="primary" size="sm" loading={savingBracket}
                          onClick={handleSaveCurrentPhase} className="w-full"
                          data-save-predictions>
                          <Save className="w-4 h-4" />
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
            savedGroupCount={Object.keys(savedGroupPreds).length}
            savedBracketCount={Object.keys(savedBracket).length}
            hasChampionPred={Object.keys(savedBracket).some(k => k.startsWith("CHAMPION:"))}
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
                      <li>✓ Desbloquea <strong className="text-amber-400">todas tus predicciones</strong></li>
                      <li>✓ Podés modificar y volver a confirmar</li>
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
                    {availablePoints < changeCost ? "Sin puntos" : `Canjear ${changeCost} pts`}
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
              onClick={() => { sessionStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
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
                  onClick={() => { sessionStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
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
                    Si acertás el marcador, ganás <strong className="text-orange-400">+150 pts extra</strong> por encima del puntaje normal.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      sessionStorage.setItem("hardcore_spotlight_seen", "1");
                      setShowHardcoreSpotlight(false);
                      await handleToggleHardcore();
                    }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4 h-4" /> Activar Modo Hardcore
                  </button>
                  <button
                    onClick={() => { sessionStorage.setItem("hardcore_spotlight_seen", "1"); setShowHardcoreSpotlight(false); }}
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
                          { label: "Acertar ganador o perdedor", pts: "150 pts" },
                          { label: "Acertar empate exacto",       pts: "250 pts" },
                        ],
                        note: "48 partidos en fase de grupos",
                      },
                      {
                        icon: "🥇",
                        title: "Clasificados por grupo",
                        rows: [
                          { label: "Equipo que clasifica",        pts: "400 pts" },
                          { label: "Posición exacta (1° o 2°)",   pts: "+600 pts" },
                        ],
                        note: "Máximo 1.000 pts por equipo · 12 grupos",
                      },
                      {
                        icon: "🏆",
                        title: "Eliminatorias",
                        rows: [
                          { label: "Ronda de 32",  pts: "700 pts" },
                          { label: "Octavos",      pts: "1.200 pts" },
                          { label: "Cuartos",      pts: "2.000 pts" },
                          { label: "Semifinal",    pts: "3.500 pts" },
                          { label: "Campeón 🏆",   pts: "10.000 pts" },
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
                          Si acertás muchos partidos o la llave entera, se suman logros con puntos extra enormes (hasta 250.000 pts).
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
                      sessionStorage.setItem("pred_onboarding_seen", "1");
                      setShowOnboarding(false);
                      if (!hardcoreMode && !sessionStorage.getItem("hardcore_spotlight_seen")) {
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
  { icon: "🚀", name: "Buen arranque",              condition: "Acertar 10 partidos de grupos",            pts: "2.000",   target: 10,  type: "match" as const },
  { icon: "🔥", name: "Racha de aciertos",          condition: "Acertar 25 partidos de grupos",            pts: "6.000",   target: 25,  type: "match" as const },
  { icon: "📊", name: "Especialista de grupos",     condition: "Acertar 40 partidos de grupos",            pts: "15.000",  target: 40,  type: "match" as const },
  { icon: "🤖", name: "Máquina de grupos",          condition: "Acertar 55 partidos de grupos",            pts: "35.000",  target: 55,  type: "match" as const },
  { icon: "🦅", name: "Ojo de halcón",              condition: "Acertar 12 clasificados de grupo",         pts: "5.000",   target: 12,  type: "classified" as const },
  { icon: "👁️", name: "Ojo clínico",               condition: "Acertar 18 clasificados de grupo",         pts: "12.000",  target: 18,  type: "classified" as const },
  { icon: "✅", name: "Todos clasificados",         condition: "Acertar los 24 clasificados",              pts: "30.000",  target: 24,  type: "classified" as const },
  { icon: "📋", name: "Tabla perfecta",             condition: "Acertar todos los 1° y 2° exactos",        pts: "50.000",  target: 12,  type: "groups" as const },
  { icon: "💪", name: "Bracket fuerte",             condition: "Acertar el 70% de eliminatorias",          pts: "20.000",  target: 22,  type: "bracket" as const },
  { icon: "🎯", name: "Bracket perfecto",           condition: "Acertar toda la llave eliminatoria",       pts: "60.000",  target: 31,  type: "bracket" as const },
  { icon: "🌍", name: "Fase de grupos excelente",   condition: "40+ partidos + 18+ clasificados correctos", pts: "35.000", target: 1,   type: "champion" as const },
  { icon: "⭐", name: "Fase de grupos perfecta",    condition: "55 partidos + tabla exacta completa",       pts: "80.000", target: 1,   type: "champion" as const },
  { icon: "🔮", name: "Prode casi perfecto",        condition: "Fase excelente + bracket fuerte",           pts: "120.000",target: 1,   type: "champion" as const },
  { icon: "🏆", name: "Prode perfecto",             condition: "Desbloquear todos los logros",              pts: "250.000",target: 14,  type: "all" as const },
];

const POINTS_TABLE = [
  { section: "Partidos de grupos", items: [
    { label: "Acertar ganador o perdedor",        pts: "150",    note: "48 partidos en grupos" },
    { label: "Acertar empate exacto",             pts: "250",    note: "(150 + 100 bonus empate)" },
    { label: "🔥 Bonus marcador exacto (Hardcore)", pts: "+150", note: "se suma al resultado acertado" },
  ]},
  { section: "Clasificados de grupo", items: [
    { label: "Acertar equipo clasificado",        pts: "400",    note: "por cada clasificado" },
    { label: "Acertar la posición exacta",        pts: "+600",   note: "extra si acertás 1° o 2° exacto" },
    { label: "Ejemplo: Argentina 1° exacto",      pts: "1.000",  note: "400 + 600 = 1.000 pts" },
  ]},
  { section: "Eliminatorias", items: [
    { label: "Equipo que pasa en Ronda de 32",    pts: "700",    note: "× 16 equipos" },
    { label: "Equipo que pasa en Octavos",        pts: "1.200",  note: "× 8 equipos" },
    { label: "Equipo que pasa en Cuartos",        pts: "2.000",  note: "× 4 equipos" },
    { label: "Equipo que pasa en Semifinal",      pts: "3.500",  note: "× 2 equipos" },
    { label: "Acertar al subcampeón (finalista)", pts: "5.000",  note: "" },
    { label: "Acertar al campeón",                pts: "10.000", note: "" },
    { label: "Campeón + subcampeón exactos",      pts: "+15.000",note: "bonus adicional" },
  ]},
];

function PointsAndAchievementsModal({
  onClose, savedMatchCount, savedGroupCount, savedBracketCount, hasChampionPred,
}: {
  onClose: () => void;
  savedMatchCount: number;
  savedGroupCount: number;
  savedBracketCount: number;
  hasChampionPred: boolean;
}) {
  const [tab, setTab] = useState<"points" | "logros">("points");

  const getProgress = (logro: typeof LOGROS[0]) => {
    switch (logro.type) {
      case "match":       return Math.min(savedMatchCount, logro.target) / logro.target;
      case "classified":  return Math.min(savedGroupCount * 2, logro.target) / logro.target;
      case "groups":      return Math.min(savedGroupCount, logro.target) / logro.target;
      case "bracket":     return Math.min(savedBracketCount, logro.target) / logro.target;
      case "champion":    return hasChampionPred ? 1 : 0;
      case "all":         return 0;
      default:            return 0;
    }
  };

  const getCurrent = (logro: typeof LOGROS[0]) => {
    switch (logro.type) {
      case "match":      return Math.min(savedMatchCount, logro.target);
      case "classified": return Math.min(savedGroupCount * 2, logro.target);
      case "groups":     return Math.min(savedGroupCount, logro.target);
      case "bracket":    return Math.min(savedBracketCount, logro.target);
      case "champion":   return hasChampionPred ? 1 : 0;
      case "all":        return 0;
      default:           return 0;
    }
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
                  120 pts (clasificado) + 180 pts (posición exacta) = <span className="text-yellow-300 font-bold">300 pts</span> solo por ese equipo.
                </div>
              </div>
            )}

            {tab === "logros" && (
              <div className="space-y-3">
                <p className="text-gray-600 text-[11px] leading-relaxed pb-1">
                  Los logros se calculan automáticamente al finalizar el torneo.
                  Las barras muestran predicciones cargadas hasta ahora.
                </p>
                {LOGROS.map(logro => {
                  const progress = getProgress(logro);
                  const current = getCurrent(logro);
                  const done = progress >= 1;
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
                      {logro.type !== "all" && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-gray-600">Progreso</span>
                            <span className={done ? "text-yellow-400 font-bold" : "text-gray-600"}>
                              {current}/{logro.target}
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${done ? "bg-yellow-400" : "bg-red-500"}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
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
}: {
  match: Match;
  saved?: Outcome;
  pending?: Outcome;
  hardcoreMode: boolean;
  pendingScore?: { home?: number; away?: number };
  savedScore?: { home: number; away: number };
  onPick: (matchId: string, outcome: Outcome) => void;
  onPickScore: (matchId: string, side: "home" | "away", value: number) => void;
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

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
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

// ─── Bracket Match Card ────────────────────────────────────────────────────────

function BracketMatchCard({
  matchNum, leftSlot, rightSlot, phase, allTeams,
  savedBracket, pendingBracket, onOpenSlot, delay = 0,
}: {
  matchNum: number; leftSlot: string; rightSlot: string;
  phase: string; allTeams: Team[];
  savedBracket: Record<string, string>; pendingBracket: Record<string, string>;
  onOpenSlot: (phase: string, slot: string) => void;
  delay?: number;
}) {
  const lKey = `${phase}:${leftSlot}`;
  const rKey = `${phase}:${rightSlot}`;
  const leftTeam  = allTeams.find(t => t.id === (savedBracket[lKey] || pendingBracket[lKey]));
  const rightTeam = allTeams.find(t => t.id === (savedBracket[rKey] || pendingBracket[rKey]));
  const leftLocked  = !!savedBracket[lKey];
  const rightLocked = !!savedBracket[rKey];
  const bothLocked  = leftLocked && rightLocked;
  const bothFilled  = !!(savedBracket[lKey] || pendingBracket[lKey]) && !!(savedBracket[rKey] || pendingBracket[rKey]);

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
        />
        <div className="flex flex-col items-center justify-center flex-shrink-0 w-10 gap-1">
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
          <span className="text-[#282828] text-[10px] font-black tracking-widest">VS</span>
          <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#252525] to-transparent" />
        </div>
        <BracketTeamSide
          team={rightTeam} isLocked={rightLocked} isPending={!!pendingBracket[rKey] && !rightLocked}
          onOpen={() => onOpenSlot(phase, rightSlot)}
        />
      </div>
    </motion.div>
  );
}

// ─── Bracket Team Side ─────────────────────────────────────────────────────────

function BracketTeamSide({ team, isLocked, isPending, onOpen }: {
  team?: Team; isLocked: boolean; isPending: boolean; onOpen: () => void;
}) {
  return (
    <motion.button
      whileTap={!isLocked ? { scale: 0.96 } : {}}
      onClick={() => !isLocked && onOpen()}
      className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 px-3 transition-all ${
        isLocked ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]"
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
