"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Save, ChevronLeft, Lock, Copy, Check, Target, Users, Trophy, Search, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";
import { isMatchPredictionWindowOpen } from "@/lib/match-utils";

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
}

interface Group {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
}

const ELIM_PHASES = [
  { key: "ROUND_OF_32",    label: "16vos", fullLabel: "Ronda de 32",      slots: 16 },
  { key: "ROUND_OF_16",    label: "8vos",  fullLabel: "Octavos de Final",  slots: 8  },
  { key: "QUARTER_FINALS", label: "4tos",  fullLabel: "Cuartos de Final",  slots: 4  },
  { key: "SEMI_FINALS",    label: "Semis", fullLabel: "Semifinales",        slots: 2  },
  { key: "CHAMPION",       label: "Final", fullLabel: "Campeón",           slots: 1  },
];

export default function SquadPredictionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"matches" | "groups" | "eliminatorias">("matches");
  const [squadName, setSquadName] = useState("");
  const [isHardcore, setIsHardcore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState<Group[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  // Match predictions
  const [savedPreds, setSavedPreds] = useState<Record<string, { home: number; away: number }>>({});
  const [pending, setPending] = useState<Record<string, { home?: number; away?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Group classification
  const [savedGroupPreds, setSavedGroupPreds] = useState<Record<string, { first?: string; second?: string; third?: string }>>({});
  const [pendingGroupPreds, setPendingGroupPreds] = useState<Record<string, { first?: string; second?: string; third?: string }>>({});
  const [savingGroup, setSavingGroup] = useState<Record<string, boolean>>({});

  // Bracket predictions
  const [savedBracket, setSavedBracket] = useState<Record<string, string>>({});
  const [pendingBracket, setPendingBracket] = useState<Record<string, string>>({});
  const [savingBracket, setSavingBracket] = useState(false);
  const [activeElimTab, setActiveElimTab] = useState(ELIM_PHASES[0].key);

  // Team selection modal for bracket
  const [selectionModal, setSelectionModal] = useState<{ phase: string; slot: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [squadRes, groupsRes, predsRes, groupPredsRes, bracketRes] = await Promise.all([
        apiFetch(`/api/participant/squads/${id}`),
        fetch("/api/public/groups"),
        apiFetch(`/api/participant/squads/${id}/predictions`),
        apiFetch(`/api/participant/squads/${id}/group-preds`),
        apiFetch(`/api/participant/squads/${id}/bracket-preds`),
      ]);

      if (squadRes.status === 401 || squadRes.status === 403) {
        router.push("/squads");
        return;
      }

      const [squadData, groupsData, predsData, groupPredsData, bracketData] = await Promise.all([
        squadRes.json(),
        groupsRes.json(),
        predsRes.json(),
        groupPredsRes.json(),
        bracketRes.json(),
      ]);

      setSquadName(squadData.squad?.name ?? "");
      setIsHardcore(squadData.squad?.isHardcore ?? false);

      const groupList: Group[] = (groupsData.groups ?? []).filter(
        (g: Group) => g.matches.length > 0 || g.teams.length > 0
      );
      setGroups(groupList);

      const teams: Team[] = [];
      const seen = new Set<string>();
      for (const gr of groupList) for (const t of gr.teams) {
        if (!seen.has(t.id)) { teams.push(t); seen.add(t.id); }
      }
      setAllTeams(teams.sort((a, b) => a.name.localeCompare(b.name)));

      // Match preds
      const matchMap: Record<string, { home: number; away: number }> = {};
      for (const p of predsData.predictions ?? []) {
        if (p.predictedHomeScore !== null && p.predictedHomeScore !== undefined &&
            p.predictedAwayScore !== null && p.predictedAwayScore !== undefined) {
          matchMap[p.matchId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
        }
      }
      setSavedPreds(matchMap);

      // Group preds
      const groupMap: Record<string, { first?: string; second?: string; third?: string }> = {};
      for (const gp of groupPredsData.groupPreds ?? []) {
        groupMap[gp.wcGroupId] = {
          first: gp.firstTeamId ?? undefined,
          second: gp.secondTeamId ?? undefined,
          third: gp.thirdTeamId ?? undefined,
        };
      }
      setSavedGroupPreds(groupMap);

      // Bracket preds
      const bracketMap: Record<string, string> = {};
      for (const bp of bracketData.bracketPreds ?? []) {
        if (bp.predictedTeamId) bracketMap[`${bp.phase}:${bp.matchSlot}`] = bp.predictedTeamId;
      }
      setSavedBracket(bracketMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Match predictions ────────────────────────────────────────────────────────

  const setScore = (matchId: string, side: "home" | "away", value: string) => {
    const n = parseInt(value);
    setPending((p) => ({
      ...p,
      [matchId]: { ...p[matchId], [side]: isNaN(n) ? undefined : Math.max(0, n) },
    }));
  };

  const saveGroup = async (matches: Match[]) => {
    const toSave = matches
      .filter((m) => {
        const p = pending[m.id];
        return p && p.home !== undefined && p.away !== undefined && isMatchPredictionWindowOpen(m.startDate);
      })
      .map((m) => ({
        matchId: m.id,
        predictedHomeScore: pending[m.id].home!,
        predictedAwayScore: pending[m.id].away!,
      }));

    if (toSave.length === 0) {
      toast.error("Completá los dos marcadores para guardar");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: toSave }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al guardar"); return; }
      const newSaved = { ...savedPreds };
      for (const p of toSave) newSaved[p.matchId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
      setSavedPreds(newSaved);
      const newPending = { ...pending };
      for (const p of toSave) delete newPending[p.matchId];
      setPending(newPending);
      toast.success(`${toSave.length} predicción${toSave.length !== 1 ? "es" : ""} guardada${toSave.length !== 1 ? "s" : ""}`);
    } finally {
      setSaving(false);
    }
  };

  const copyFromGlobal = async () => {
    setCopied(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/copy-predictions`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); setCopied(false); return; }
      toast.success(`${data.copied} predicciones copiadas del prode global`);
      load();
    } catch {
      setCopied(false);
    }
  };

  // ── Group classification ─────────────────────────────────────────────────────

  const handleToggleGroupTeam = (groupId: string, teamId: string) => {
    setPendingGroupPreds(prev => {
      const cur = prev[groupId] || {};
      if (cur.first === teamId) return { ...prev, [groupId]: { ...cur, first: undefined } };
      if (cur.second === teamId) return { ...prev, [groupId]: { ...cur, second: undefined } };
      if (cur.third === teamId) return { ...prev, [groupId]: { ...cur, third: undefined } };
      if (!cur.first) return { ...prev, [groupId]: { ...cur, first: teamId } };
      if (!cur.second) return { ...prev, [groupId]: { ...cur, second: teamId } };
      if (!cur.third) return { ...prev, [groupId]: { ...cur, third: teamId } };
      return { ...prev, [groupId]: { ...cur, third: teamId } };
    });
  };

  const saveGroupClassification = async (groupId: string) => {
    const p = pendingGroupPreds[groupId];
    if (!p?.first || !p?.second) { toast.error("Seleccioná 1° y 2° lugar"); return; }
    setSavingGroup(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/group-preds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wcGroupId: groupId, firstTeamId: p.first, secondTeamId: p.second, thirdTeamId: p.third ?? null }),
      });
      if (res.ok) {
        setSavedGroupPreds(prev => ({ ...prev, [groupId]: p }));
        setPendingGroupPreds(prev => { const n = { ...prev }; delete n[groupId]; return n; });
        toast.success("Clasificados guardados ✓");
      } else { const d = await res.json(); toast.error(d.error || "Error"); }
    } catch { toast.error("Error de conexión"); }
    finally { setSavingGroup(prev => ({ ...prev, [groupId]: false })); }
  };

  // ── Bracket predictions ──────────────────────────────────────────────────────

  const isPhaseUnlocked = useCallback((phaseKey: string): boolean => {
    const idx = ELIM_PHASES.findIndex(p => p.key === phaseKey);
    if (idx === 0) {
      return groups.length > 0 && Object.keys(savedGroupPreds).length >= groups.length;
    }
    const prev = ELIM_PHASES[idx - 1];
    return Object.keys(savedBracket).filter(k => k.startsWith(`${prev.key}:`)).length >= prev.slots;
  }, [savedBracket, savedGroupPreds, groups]);

  const getEligibleTeams = useCallback((phaseKey: string): Team[] => {
    const idx = ELIM_PHASES.findIndex(p => p.key === phaseKey);
    if (idx === 0) {
      const ids = new Set<string>();
      for (const pred of Object.values(savedGroupPreds)) {
        if (pred.first) ids.add(pred.first);
        if (pred.second) ids.add(pred.second);
        if (pred.third) ids.add(pred.third);
      }
      return allTeams.filter(t => ids.has(t.id));
    }
    const prev = ELIM_PHASES[idx - 1];
    const prevIds = Object.entries(savedBracket)
      .filter(([k]) => k.startsWith(`${prev.key}:`))
      .map(([, v]) => v);
    return allTeams.filter(t => prevIds.includes(t.id));
  }, [savedBracket, savedGroupPreds, allTeams]);

  const handleSaveBracket = async () => {
    const phasePending = Object.entries(pendingBracket).filter(([k]) => k.startsWith(`${activeElimTab}:`));
    if (phasePending.length === 0) return;
    setSavingBracket(true);
    let ok = 0;
    for (const [key, teamId] of phasePending) {
      if (savedBracket[key]) continue;
      const [phase, slot] = key.split(":");
      try {
        const res = await apiFetch(`/api/participant/squads/${id}/bracket-preds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase, matchSlot: slot, predictedTeamId: teamId }),
        });
        if (res.ok) {
          setSavedBracket(prev => ({ ...prev, [key]: teamId }));
          setPendingBracket(prev => { const n = { ...prev }; delete n[key]; return n; });
          ok++;
        } else { const d = await res.json(); toast.error(d.error || "Error"); }
      } catch { toast.error("Error de conexión"); }
    }
    if (ok > 0) toast.success(`${ok} selección${ok > 1 ? "es" : ""} guardada${ok > 1 ? "s" : ""} ✓`);
    setSavingBracket(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  const currentPhase = ELIM_PHASES.find(p => p.key === activeElimTab)!;
  const currentPhaseUnlocked = isPhaseUnlocked(activeElimTab);
  const currentPhasePendingCount = Object.keys(pendingBracket).filter(k => k.startsWith(`${activeElimTab}:`)).length;
  const eligibleTeams = selectionModal ? getEligibleTeams(selectionModal.phase) : [];
  const filteredTeams = eligibleTeams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/squads/${id}`} className="text-gray-500 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white">Mis predicciones</h1>
              <p className="text-gray-500 text-xs truncate">{squadName}</p>
            </div>
            <div className="flex items-center gap-2">
              {isHardcore && <Badge variant="error" className="text-xs hidden sm:flex">Hardcore</Badge>}
              <button
                onClick={copyFromGlobal}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">Copiar global</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6">
            {[
              { key: "matches",       label: "Partidos",      icon: <Target className="w-3.5 h-3.5" /> },
              { key: "groups",        label: "Grupos",        icon: <Users  className="w-3.5 h-3.5" /> },
              { key: "eliminatorias", label: "Eliminatorias", icon: <Trophy className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.key ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── PARTIDOS ──────────────────────────────────────────────────────── */}
          {activeTab === "matches" && (
            <div className="space-y-5">
              {isHardcore && (
                <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3">
                  <p className="text-orange-300 text-sm font-bold">Modo Hardcore</p>
                  <p className="text-orange-500/70 text-xs mt-0.5">Predecí el marcador exacto. Bonus extra si acertás.</p>
                </div>
              )}
              {groups.length === 0 && (
                <div className="py-12 text-center text-gray-500">No hay partidos disponibles aún.</div>
              )}
              {groups.map((group) => {
                const groupHasPending = group.matches.some((m) => {
                  const p = pending[m.id];
                  return p && (p.home !== undefined || p.away !== undefined);
                });
                const readyToSave = group.matches.filter((m) => {
                  const p = pending[m.id];
                  return p && p.home !== undefined && p.away !== undefined && isMatchPredictionWindowOpen(m.startDate);
                }).length;

                return (
                  <div key={group.id} className="space-y-1.5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      Grupo {group.name}
                    </h2>
                    <div className="space-y-2">
                      {group.matches.map((m) => {
                        const open = isMatchPredictionWindowOpen(m.startDate);
                        const saved = savedPreds[m.id];
                        const pend = pending[m.id];

                        return (
                          <Card key={m.id} className={`p-3 ${!open ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 flex-1 justify-end">
                                <span className="text-white text-sm font-semibold truncate text-right">
                                  {m.homeTeam?.code ?? m.homePlaceholder ?? "?"}
                                </span>
                                {m.homeTeam?.flagUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.homeTeam.flagUrl} className="w-5 h-4 object-cover rounded-sm" alt="" />
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {open ? (
                                  <>
                                    <input
                                      type="number" min={0} max={99}
                                      className="w-10 h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-center text-white font-bold text-sm focus:border-red-500 focus:outline-none"
                                      value={pend?.home !== undefined ? pend.home : saved?.home !== undefined ? saved.home : ""}
                                      onChange={(e) => setScore(m.id, "home", e.target.value)}
                                    />
                                    <span className="text-gray-600 text-xs">-</span>
                                    <input
                                      type="number" min={0} max={99}
                                      className="w-10 h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-center text-white font-bold text-sm focus:border-red-500 focus:outline-none"
                                      value={pend?.away !== undefined ? pend.away : saved?.away !== undefined ? saved.away : ""}
                                      onChange={(e) => setScore(m.id, "away", e.target.value)}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="w-10 h-9 bg-[#111] rounded-lg flex items-center justify-center text-gray-600 font-bold text-sm">
                                      {saved?.home !== undefined ? saved.home : m.homeScore !== undefined ? m.homeScore : "-"}
                                    </span>
                                    <span className="text-gray-600 text-xs">-</span>
                                    <span className="w-10 h-9 bg-[#111] rounded-lg flex items-center justify-center text-gray-600 font-bold text-sm">
                                      {saved?.away !== undefined ? saved.away : m.awayScore !== undefined ? m.awayScore : "-"}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-1">
                                {m.awayTeam?.flagUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.awayTeam.flagUrl} className="w-5 h-4 object-cover rounded-sm" alt="" />
                                )}
                                <span className="text-white text-sm font-semibold truncate">
                                  {m.awayTeam?.code ?? m.awayPlaceholder ?? "?"}
                                </span>
                              </div>

                              <div className="w-5 flex-shrink-0">
                                {!open && <Lock className="w-3.5 h-3.5 text-gray-700" />}
                                {open && saved && !pend && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" title="Guardado" />
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {groupHasPending && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                        <Button
                          variant="primary" size="sm" loading={saving}
                          onClick={() => saveGroup(group.matches)}
                          className="w-full"
                          disabled={readyToSave === 0}
                        >
                          <Save className="w-4 h-4" />
                          {readyToSave === 0
                            ? "Completá ambos marcadores para guardar"
                            : `Guardar ${readyToSave} pred${readyToSave !== 1 ? "s" : ""} del Grupo ${group.name}`}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── GRUPOS ────────────────────────────────────────────────────────── */}
          {activeTab === "groups" && (
            <div className="space-y-4">
              <div className="bg-[#0f1a0f] border border-green-500/20 rounded-xl p-4">
                <p className="text-green-400 text-xs font-black uppercase tracking-widest mb-2">Formato 2026</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  12 grupos de 4 equipos. Clasifican los <span className="text-white font-semibold">2 primeros</span> de cada grupo
                  + los <span className="text-white font-semibold">8 mejores terceros</span> del torneo.
                  Podés predecir el 3° de cada grupo (opcional, +250 pts si ese equipo avanza).
                </p>
              </div>

              {groups.length === 0 && (
                <div className="py-12 text-center text-gray-500">No hay grupos disponibles aún.</div>
              )}

              {groups.map(group => {
                const saved = savedGroupPreds[group.id];
                const pend = pendingGroupPreds[group.id] || {};
                const firstId  = pend.first  ?? saved?.first;
                const secondId = pend.second ?? saved?.second;
                const thirdId  = pend.third  ?? saved?.third;
                const firstTeam  = group.teams.find(t => t.id === firstId);
                const secondTeam = group.teams.find(t => t.id === secondId);
                const thirdTeam  = group.teams.find(t => t.id === thirdId);
                const hasPendingChange = !!(pend.first || pend.second || pend.third);
                const canSave = !!(pend.first && pend.second);

                return (
                  <div key={group.id} className={`rounded-2xl border overflow-hidden ${saved && !hasPendingChange ? "border-green-500/15" : "border-[#222]"}`}>
                    <div className={`px-4 py-3 flex items-center gap-3 ${saved && !hasPendingChange ? "bg-[#0d110d]" : "bg-[#111]"}`}>
                      <span className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        {group.name}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm">Grupo {group.name}</h3>
                        <p className="text-gray-600 text-xs truncate">{group.teams.map(t => t.name).join(" · ")}</p>
                      </div>
                      {saved && !hasPendingChange && (
                        <span className="text-xs text-green-400 font-semibold flex-shrink-0">Guardado ✓</span>
                      )}
                    </div>

                    <div className={`p-4 space-y-4 ${saved && !hasPendingChange ? "bg-[#0d110d]" : "bg-[#0f0f0f]"}`}>
                      {/* Slots */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "1° Lugar",     emoji: "🥇", team: firstTeam,  color: "yellow" },
                          { label: "2° Lugar",     emoji: "🥈", team: secondTeam, color: "gray"   },
                          { label: "3° (opcional)", emoji: "🥉", team: thirdTeam,  color: "bronze" },
                        ].map(slot => (
                          <div key={slot.label} className={`flex flex-col items-center p-3 rounded-xl border gap-1.5 text-center min-h-[100px] justify-center transition-all ${
                            slot.team
                              ? slot.color === "yellow" ? "bg-yellow-500/10 border-yellow-500/30"
                              : slot.color === "gray"   ? "bg-[#1e1e1e] border-gray-500/30"
                              : "bg-orange-900/10 border-orange-800/30"
                              : "bg-[#161616] border-dashed border-[#262626]"
                          }`}>
                            <span className="text-xl leading-none">{slot.emoji}</span>
                            <p className={`text-[9px] font-black uppercase tracking-wider ${
                              slot.team
                                ? slot.color === "yellow" ? "text-yellow-400"
                                : slot.color === "gray"   ? "text-gray-400"
                                : "text-orange-500"
                                : "text-gray-700"
                            }`}>{slot.label}</p>
                            {slot.team ? (
                              <>
                                {slot.team.flagUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={slot.team.flagUrl} alt="" className="w-9 h-6 object-cover rounded shadow" />
                                )}
                                <p className={`font-bold text-[10px] leading-tight ${
                                  slot.color === "yellow" ? "text-yellow-200" : slot.color === "gray" ? "text-gray-200" : "text-orange-200"
                                }`}>{slot.team.name}</p>
                              </>
                            ) : (
                              <div className="w-9 h-6 rounded border-2 border-dashed border-[#262626] flex items-center justify-center">
                                <span className="text-gray-800 text-[10px] font-bold">?</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Team picker */}
                      <div className="space-y-1.5">
                        <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest">
                          {!firstId ? "Tocá para el 1° lugar" :
                           !secondId ? "Tocá para el 2° lugar" :
                           !thirdId ? "Tocá para el 3° (opcional)" :
                           "Tocá para cambiar"}
                        </p>
                        {group.teams.map(team => {
                          const isFirst  = firstId  === team.id;
                          const isSecond = secondId === team.id;
                          const isThird  = thirdId  === team.id;
                          return (
                            <motion.button key={team.id} whileTap={{ scale: 0.97 }}
                              onClick={() => handleToggleGroupTeam(group.id, team.id)}
                              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
                                isFirst  ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-200" :
                                isSecond ? "bg-[#1e1e1e] border-gray-500/30 text-gray-200" :
                                isThird  ? "bg-orange-900/15 border-orange-800/30 text-orange-200" :
                                "bg-[#141414] border-[#222] text-gray-400 hover:border-[#333] hover:text-gray-200"
                              }`}
                            >
                              {team.flagUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={team.flagUrl} alt="" className="w-7 h-5 object-cover rounded flex-shrink-0" />
                              )}
                              <span className="font-semibold text-sm flex-1 text-left">{team.name}</span>
                              {isFirst  && <span className="text-xs font-black text-yellow-400">🥇 1°</span>}
                              {isSecond && <span className="text-xs font-black text-gray-300">🥈 2°</span>}
                              {isThird  && <span className="text-xs font-black text-orange-400">🥉 3°</span>}
                              {!isFirst && !isSecond && !isThird && (
                                <span className="text-[10px] text-gray-700">
                                  {!firstId ? "→ 1°" : !secondId ? "→ 2°" : !thirdId ? "→ 3°" : "Cambiar"}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>

                      {hasPendingChange && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                          <Button
                            variant="primary" size="sm" loading={savingGroup[group.id]}
                            onClick={() => saveGroupClassification(group.id)}
                            className="w-full"
                            disabled={!canSave}
                          >
                            <Save className="w-4 h-4" />
                            {canSave ? `Guardar clasificados Grupo ${group.name}` : "Seleccioná 1° y 2° lugar"}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ELIMINATORIAS ─────────────────────────────────────────────────── */}
          {activeTab === "eliminatorias" && (
            <div>
              {/* Phase sub-tabs */}
              <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-5 overflow-x-auto">
                {ELIM_PHASES.map(phase => {
                  const phaseSaved   = Object.keys(savedBracket).filter(k => k.startsWith(`${phase.key}:`)).length;
                  const phasePending = Object.keys(pendingBracket).filter(k => k.startsWith(`${phase.key}:`)).length;
                  const isComplete   = phaseSaved === phase.slots;
                  const isActive     = activeElimTab === phase.key;
                  const unlocked     = isPhaseUnlocked(phase.key);
                  return (
                    <button key={phase.key}
                      onClick={() => { if (unlocked) setActiveElimTab(phase.key); }}
                      className={`flex-1 flex flex-col items-center py-2 px-1.5 rounded-lg transition-all whitespace-nowrap min-w-[50px] ${
                        !unlocked ? "opacity-40 cursor-not-allowed" :
                        isActive  ? "bg-red-600 text-white" :
                        "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <span className="text-xs leading-none mb-0.5">{!unlocked ? "🔒" : "⚽"}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">{phase.label}</span>
                      <span className={`text-[9px] mt-0.5 ${
                        isActive ? "text-red-200" : isComplete ? "text-green-500" :
                        phasePending > 0 ? "text-amber-500" : phaseSaved > 0 ? "text-gray-500" : "text-gray-800"
                      }`}>
                        {!unlocked ? "🔒" : isComplete ? `✓${phase.slots}` : `${phaseSaved}/${phase.slots}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeElimTab}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                  {!currentPhaseUnlocked ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-5xl mb-4">🔒</div>
                      <p className="text-white font-black text-lg mb-2">Fase bloqueada</p>
                      {activeElimTab === "ROUND_OF_32" ? (
                        <>
                          <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                            Primero guardá los <span className="text-white font-semibold">clasificados 1° y 2° de los {groups.length} grupos</span> en la pestaña Grupos.
                          </p>
                          <p className="text-gray-700 text-xs mt-2">
                            Guardados: {Object.keys(savedGroupPreds).length}/{groups.length} grupos
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
                          Completá <span className="text-white font-semibold">
                            {ELIM_PHASES[ELIM_PHASES.findIndex(p => p.key === activeElimTab) - 1]?.fullLabel}
                          </span> primero.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 bg-[#0f1a0f] border border-green-500/20 rounded-xl p-3">
                        <p className="text-green-400 text-xs font-bold">{currentPhase.fullLabel}</p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          Elegí {currentPhase.slots} equipo{currentPhase.slots !== 1 ? "s" : ""} que avanzan.
                          Guardados: {Object.keys(savedBracket).filter(k => k.startsWith(`${activeElimTab}:`)).length}/{currentPhase.slots}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Array.from({ length: currentPhase.slots }, (_, i) => {
                          const slot = `${i + 1}`;
                          const key = `${activeElimTab}:${slot}`;
                          const savedTeamId = savedBracket[key];
                          const pendingTeamId = pendingBracket[key];
                          const teamId = savedTeamId || pendingTeamId;
                          const team = allTeams.find(t => t.id === teamId);
                          const isSaved = !!savedTeamId;

                          return (
                            <button
                              key={slot}
                              onClick={() => { if (!isSaved) { setSelectionModal({ phase: activeElimTab, slot }); setSearchTerm(""); } }}
                              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                                isSaved ? "bg-green-500/5 border-green-500/20 cursor-default" :
                                team ? "bg-[#1a1a1a] border-red-500/30 hover:border-red-500/50" :
                                "bg-[#141414] border-dashed border-[#262626] hover:border-[#333]"
                              }`}
                            >
                              {team ? (
                                <>
                                  {team.flagUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={team.flagUrl} alt="" className="w-7 h-5 object-cover rounded flex-shrink-0" />
                                  )}
                                  <span className={`font-bold text-xs truncate ${isSaved ? "text-green-300" : "text-white"}`}>
                                    {team.name}
                                  </span>
                                  {isSaved && <span className="ml-auto text-green-500 text-[10px]">✓</span>}
                                </>
                              ) : (
                                <>
                                  <div className="w-7 h-5 rounded bg-[#222] flex-shrink-0" />
                                  <span className="text-gray-700 text-xs">Slot {slot}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {currentPhasePendingCount > 0 && (
                        <Button variant="primary" size="sm" loading={savingBracket}
                          onClick={handleSaveBracket} className="w-full">
                          <Save className="w-4 h-4" />
                          Guardar {currentPhasePendingCount} selección{currentPhasePendingCount !== 1 ? "es" : ""}
                        </Button>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Team Selection Modal */}
      <AnimatePresence>
        {selectionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectionModal(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                <p className="text-white font-bold text-sm">
                  {ELIM_PHASES.find(p => p.key === selectionModal.phase)?.fullLabel} — Slot {selectionModal.slot}
                </p>
                <button onClick={() => setSelectionModal(null)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-2 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar equipo..."
                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-600"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {filteredTeams.length === 0 && (
                  <div className="py-8 text-center text-gray-600 text-sm">Sin resultados</div>
                )}
                {filteredTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => {
                      const key = `${selectionModal.phase}:${selectionModal.slot}`;
                      setPendingBracket(prev => ({ ...prev, [key]: team.id }));
                      setSelectionModal(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors"
                  >
                    {team.flagUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.flagUrl} alt="" className="w-8 h-5 object-cover rounded flex-shrink-0" />
                    )}
                    <span className="text-white font-semibold text-sm">{team.name}</span>
                    <span className="text-gray-600 text-xs ml-auto">{team.code}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
