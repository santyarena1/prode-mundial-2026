"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Edit2, Check, X, Users, Trophy, Gift, Zap, Crown, CheckCircle2, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Team { id: string; name: string; code: string }
interface Match { id: string; matchCode: string; phase: string; status: string; homeTeam?: Team; awayTeam?: Team; homeScore?: number; awayScore?: number }
interface Prediction { id: string; matchId: string; predictedHomeScore: number; predictedAwayScore: number; pointsEarned: number; match: Match }
interface GroupPred { id: string; wcGroupId: string; wcGroup: { name: string }; firstTeam?: Team; secondTeam?: Team; pointsEarned: number }
interface Prize { id: string; name: string; description?: string; pointsCost: number; stock: number; active: boolean; _count: { redemptions: number } }
interface Redemption { id: string; prizeId: string; pointsSpent: number; status: string; createdAt: string; prize: Prize }
interface Member {
  id: string;
  userId: string;
  role: string;
  totalPoints: number;
  spentPoints: number;
  user: { id: string; firstName: string; lastName: string; email: string; instagram?: string };
  predictions: Prediction[];
  groupPreds: GroupPred[];
  redemptions: Redemption[];
}
interface Squad {
  id: string;
  name: string;
  description?: string;
  isHardcore: boolean;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  creator: { id: string; firstName: string; lastName: string; email: string };
  members: Member[];
  prizes: Prize[];
  pointRules: { key: string; points: number }[];
}

type Tab = "miembros" | "premios" | "canjes";

const RULE_LABELS: Record<string, string> = {
  GROUP_SIGN: "Acertar resultado", GROUP_DRAW_BONUS: "Bonus empate", EXACT_SCORE: "Marcador exacto (HC)",
  GROUP_CLASSIFIED: "Clasificado del grupo", GROUP_POSITION: "Posición exacta", ROUND_OF_32: "16vos",
  ROUND_OF_16: "Octavos", QUARTER_FINALS: "Cuartos", SEMI_FINALS: "Semis",
  CHAMPION: "Campeón", RUNNER_UP: "Finalista", FINAL_EXACT: "Final perfecta",
};

export default function AdminSquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [defaultRules, setDefaultRules] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("miembros");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Inline prediction edit
  const [editingPred, setEditingPred] = useState<string | null>(null);
  const [editScores, setEditScores] = useState({ home: "", away: "" });
  const [savingPred, setSavingPred] = useState(false);

  // Redemption status update
  const [updatingRedemption, setUpdatingRedemption] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/squads/${id}`);
    if (!res.ok) { router.push("/admin/squads"); return; }
    const data = await res.json();
    setSquad(data.squad);
    setDefaultRules(data.defaultRules);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const deletePrediction = async (memberId: string, predId: string) => {
    if (!confirm("¿Eliminar esta predicción?")) return;
    const res = await fetch(`/api/admin/squads/${id}/members/${memberId}/predictions/${predId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    toast.success("Predicción eliminada");
    load();
  };

  const startEditPred = (pred: Prediction) => {
    setEditingPred(pred.id);
    setEditScores({ home: String(pred.predictedHomeScore), away: String(pred.predictedAwayScore) });
  };

  const savePred = async (memberId: string, predId: string) => {
    const home = parseInt(editScores.home);
    const away = parseInt(editScores.away);
    if (isNaN(home) || isNaN(away)) { toast.error("Ingresá marcadores válidos"); return; }
    setSavingPred(true);
    try {
      const res = await fetch(`/api/admin/squads/${id}/members/${memberId}/predictions/${predId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictedHomeScore: home, predictedAwayScore: away }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      toast.success("Predicción actualizada");
      setEditingPred(null);
      load();
    } finally {
      setSavingPred(false);
    }
  };

  const updateRedemption = async (squadId: string, redemptionId: string, status: string) => {
    setUpdatingRedemption((p) => ({ ...p, [redemptionId]: true }));
    try {
      const res = await fetch(`/api/admin/squads/${squadId}/redemptions/${redemptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Error"); return; }
      toast.success(status === "approved" ? "Canje aprobado" : "Canje rechazado");
      load();
    } finally {
      setUpdatingRedemption((p) => ({ ...p, [redemptionId]: false }));
    }
  };

  const deletePrize = async (prizeId: string) => {
    if (!confirm("¿Eliminar este premio?")) return;
    const res = await fetch(`/api/admin/squads/${id}/prizes/${prizeId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error"); return; }
    toast.success("Premio eliminado");
    load();
  };

  if (loading) return <LoadingScreen />;
  if (!squad) return null;

  const allRedemptions = squad.members.flatMap((m) =>
    m.redemptions.map((r) => ({ ...r, member: m }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push("/admin/squads")} className="mt-1 text-gray-500 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-black text-white">{squad.name}</h2>
            {squad.isHardcore && <Badge variant="error">Hardcore</Badge>}
            <span className="font-mono text-gray-600 text-xs">{squad.inviteCode}</span>
          </div>
          {squad.description && <p className="text-gray-500 text-sm">{squad.description}</p>}
          <p className="text-gray-600 text-xs mt-1">
            Creado por {squad.creator.firstName} {squad.creator.lastName} · {new Date(squad.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-black text-white">{squad.members.length}</p>
          <p className="text-gray-500 text-xs mt-0.5">Miembros</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black text-white">{squad.prizes.length}</p>
          <p className="text-gray-500 text-xs mt-0.5">Premios</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black text-white">{allRedemptions.length}</p>
          <p className="text-gray-500 text-xs mt-0.5">Canjes</p>
        </Card>
      </div>

      {/* Custom point rules (if any) */}
      {squad.pointRules.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Reglas personalizadas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {squad.pointRules.map((r) => (
              <div key={r.key} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs">{RULE_LABELS[r.key] ?? r.key}</span>
                <span className={`text-xs font-bold ml-2 ${r.points !== defaultRules[r.key] ? "text-yellow-400" : "text-gray-600"}`}>
                  {r.points}
                </span>
              </div>
            ))}
          </div>
          <p className="text-gray-700 text-xs mt-2">Los valores en amarillo difieren de los defaults del prode global.</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
        {(["miembros", "premios", "canjes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all capitalize ${
              tab === t ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
            {t === "canjes" && allRedemptions.filter(r => r.status === "pending").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black">
                {allRedemptions.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MIEMBROS tab */}
      {tab === "miembros" && (
        <div className="space-y-3">
          {squad.members.map((m, i) => (
            <Card key={m.id} className="overflow-hidden">
              {/* Member header row */}
              <button
                type="button"
                className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-700/20 text-orange-500" : "bg-[#1a1a1a] text-gray-600"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{m.user.firstName} {m.user.lastName}</span>
                    {m.role === "admin" && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                    <span className="text-gray-600 text-xs">{m.user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
                    <span className="text-yellow-500 font-bold">{m.totalPoints} pts</span>
                    <span>{m.predictions.length} preds</span>
                    <span>{m.groupPreds.length} grupos</span>
                    {m.redemptions.length > 0 && <span>{m.redemptions.length} canjes</span>}
                  </div>
                </div>
                <span className="text-gray-600 text-xs">{expandedMember === m.id ? "▲" : "▼"}</span>
              </button>

              {/* Expanded content */}
              {expandedMember === m.id && (
                <div className="border-t border-[#1a1a1a] p-4 space-y-4">

                  {/* Match predictions */}
                  {m.predictions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Predicciones de partidos</h4>
                      <div className="space-y-1.5">
                        {m.predictions.map((pred) => (
                          <div key={pred.id} className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-400 text-xs">
                                {pred.match.homeTeam?.code ?? "?"} vs {pred.match.awayTeam?.code ?? "?"}
                                <span className="text-gray-600 ml-1 text-[10px]">{pred.match.phase}</span>
                              </span>
                            </div>
                            {editingPred === pred.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min={0} max={99}
                                  className="w-9 h-7 bg-[#1a1a1a] border border-[#333] rounded text-center text-white text-sm"
                                  value={editScores.home}
                                  onChange={(e) => setEditScores((p) => ({ ...p, home: e.target.value }))}
                                />
                                <span className="text-gray-600 text-xs">-</span>
                                <input
                                  type="number" min={0} max={99}
                                  className="w-9 h-7 bg-[#1a1a1a] border border-[#333] rounded text-center text-white text-sm"
                                  value={editScores.away}
                                  onChange={(e) => setEditScores((p) => ({ ...p, away: e.target.value }))}
                                />
                                <button onClick={() => savePred(m.id, pred.id)} disabled={savingPred} className="text-green-400 hover:text-green-300 disabled:opacity-40 ml-1">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingPred(null)} className="text-gray-600 hover:text-white">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-sm">
                                  {pred.predictedHomeScore} - {pred.predictedAwayScore}
                                </span>
                                {pred.match.status === "finished" && pred.match.homeScore !== undefined && (
                                  <span className="text-gray-600 text-xs">
                                    (real: {pred.match.homeScore}-{pred.match.awayScore})
                                  </span>
                                )}
                                {pred.pointsEarned > 0 && (
                                  <Badge variant="success" className="text-[10px]">+{pred.pointsEarned}</Badge>
                                )}
                                <button onClick={() => startEditPred(pred)} className="text-gray-600 hover:text-white ml-1">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deletePrediction(m.id, pred.id)} className="text-gray-600 hover:text-red-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group predictions */}
                  {m.groupPreds.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Predicciones de grupos</h4>
                      <div className="space-y-1.5">
                        {m.groupPreds.map((gp) => (
                          <div key={gp.id} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                            <span className="text-gray-400 text-xs">Grupo {gp.wcGroup.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-xs">
                                1° {gp.firstTeam?.code ?? "—"} · 2° {gp.secondTeam?.code ?? "—"}
                              </span>
                              {gp.pointsEarned > 0 && <Badge variant="success" className="text-[10px]">+{gp.pointsEarned}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.predictions.length === 0 && m.groupPreds.length === 0 && (
                    <p className="text-gray-600 text-sm text-center py-2">Sin predicciones cargadas</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* PREMIOS tab */}
      {tab === "premios" && (
        <div className="space-y-2">
          {squad.prizes.length === 0 && (
            <Card className="p-8 text-center text-gray-500 text-sm">No hay premios creados en este grupo</Card>
          )}
          {squad.prizes.map((prize) => (
            <Card key={prize.id} className={`p-4 ${!prize.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{prize.name}</span>
                    {!prize.active && <Badge variant="default" className="text-[10px]">Inactivo</Badge>}
                    <Badge variant="success" className="text-[10px]">{prize.pointsCost} pts</Badge>
                  </div>
                  {prize.description && <p className="text-gray-500 text-xs mt-0.5">{prize.description}</p>}
                  <p className="text-gray-600 text-xs mt-1">
                    {prize.stock >= 0
                      ? `Stock: ${Math.max(0, prize.stock - prize._count.redemptions)}/${prize.stock}`
                      : "Stock ilimitado"
                    } · {prize._count.redemptions} canjeado{prize._count.redemptions !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => deletePrize(prize.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                  title="Eliminar premio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CANJES tab */}
      {tab === "canjes" && (
        <div className="space-y-2">
          {allRedemptions.length === 0 && (
            <Card className="p-8 text-center text-gray-500 text-sm">No hay canjes registrados</Card>
          )}
          {allRedemptions.map((r) => (
            <Card key={r.id} className={`p-4 ${r.status === "pending" ? "border-yellow-600/30" : ""}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{r.prize.name}</span>
                    <Badge
                      variant={r.status === "approved" ? "success" : r.status === "rejected" ? "error" : "warning"}
                      className="text-[10px]"
                    >
                      {r.status === "approved" ? "aprobado" : r.status === "rejected" ? "rechazado" : "pendiente"}
                    </Badge>
                    <Badge variant="success" className="text-[10px]">{r.pointsSpent} pts</Badge>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {r.member.user.firstName} {r.member.user.lastName} · {r.member.user.email}
                  </p>
                  <p className="text-gray-700 text-xs mt-0.5">
                    {new Date(r.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={updatingRedemption[r.id]}
                      onClick={() => updateRedemption(id, r.id, "approved")}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Aprobar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={updatingRedemption[r.id]}
                      onClick={() => updateRedemption(id, r.id, "rejected")}
                    >
                      <XCircle className="w-3 h-3" /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
