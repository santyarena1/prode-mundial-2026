"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Save, ChevronLeft, Lock, Copy, Check } from "lucide-react";
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
  matches: Match[];
}

interface SquadPred {
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

export default function SquadPredictionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [squadName, setSquadName] = useState("");
  const [isHardcore, setIsHardcore] = useState(false);
  const [savedPreds, setSavedPreds] = useState<Record<string, { home: number; away: number }>>({});
  const [pending, setPending] = useState<Record<string, { home?: number; away?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [squadRes, groupsRes, predsRes] = await Promise.all([
        apiFetch(`/api/participant/squads/${id}`),
        apiFetch("/api/public/groups"),
        apiFetch(`/api/participant/squads/${id}/predictions`),
      ]);

      if (squadRes.status === 401 || squadRes.status === 403) {
        router.push("/squads");
        return;
      }

      const [squadData, groupsData, predsData] = await Promise.all([
        squadRes.json(),
        groupsRes.json(),
        predsRes.json(),
      ]);

      setSquadName(squadData.squad.name);
      setIsHardcore(squadData.squad.isHardcore);

      const groupMatches: Group[] = (groupsData.groups || []).filter(
        (g: Group) => g.matches.length > 0
      );
      setGroups(groupMatches);

      const map: Record<string, { home: number; away: number }> = {};
      for (const p of predsData.predictions || []) {
        map[p.matchId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
      }
      setSavedPreds(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

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

    if (toSave.length === 0) { toast.error("No hay predicciones nuevas para guardar"); return; }

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

  if (loading) return <LoadingScreen />;

  const hasPending = Object.values(pending).some((p) => p.home !== undefined || p.away !== undefined);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/squads/${id}`} className="text-gray-500 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white">Mis predicciones</h1>
              <p className="text-gray-500 text-xs">{squadName}</p>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            {isHardcore && (
              <Badge variant="error" className="text-xs">Hardcore — marcador exacto</Badge>
            )}
            <button
              onClick={copyFromGlobal}
              className="ml-auto text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copiar del prode global
            </button>
          </div>

          {/* Groups */}
          {groups.map((group) => {
            const groupPending = group.matches.filter((m) => {
              const p = pending[m.id];
              return p && p.home !== undefined && p.away !== undefined && isMatchPredictionWindowOpen(m.startDate);
            });

            return (
              <div key={group.id} className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
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
                          {/* Home */}
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            <span className="text-white text-sm font-semibold truncate text-right">
                              {m.homeTeam?.code ?? m.homePlaceholder ?? "?"}
                            </span>
                            {m.homeTeam?.flagUrl && (
                              <img src={m.homeTeam.flagUrl} className="w-5 h-4 object-cover rounded-sm" alt="" />
                            )}
                          </div>

                          {/* Score inputs */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {open ? (
                              <>
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  className="w-10 h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-center text-white font-bold text-sm focus:border-red-500 focus:outline-none"
                                  value={pend?.home !== undefined ? pend.home : saved?.home !== undefined ? saved.home : ""}
                                  onChange={(e) => setScore(m.id, "home", e.target.value)}
                                  placeholder={saved?.home !== undefined ? String(saved.home) : "-"}
                                />
                                <span className="text-gray-600 text-xs">-</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  className="w-10 h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-center text-white font-bold text-sm focus:border-red-500 focus:outline-none"
                                  value={pend?.away !== undefined ? pend.away : saved?.away !== undefined ? saved.away : ""}
                                  onChange={(e) => setScore(m.id, "away", e.target.value)}
                                  placeholder={saved?.away !== undefined ? String(saved.away) : "-"}
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

                          {/* Away */}
                          <div className="flex items-center gap-1.5 flex-1">
                            {m.awayTeam?.flagUrl && (
                              <img src={m.awayTeam.flagUrl} className="w-5 h-4 object-cover rounded-sm" alt="" />
                            )}
                            <span className="text-white text-sm font-semibold truncate">
                              {m.awayTeam?.code ?? m.awayPlaceholder ?? "?"}
                            </span>
                          </div>

                          {/* Status */}
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

                {groupPending.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2"
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      loading={saving}
                      onClick={() => saveGroup(group.matches)}
                      className="w-full"
                    >
                      <Save className="w-4 h-4" />
                      Guardar {groupPending.length} pred{groupPending.length !== 1 ? "s" : ""} del Grupo {group.name}
                    </Button>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
