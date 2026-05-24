"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Trophy, Star, Zap, Gift, Medal, Target, Trash2, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

type Tab = "bonuses" | "redemptions" | "predictions" | "achievements";

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagram?: string | null;
  totalPoints: number;
  predictionPoints: number;
  bonusPoints: number;
  spentPoints: number;
  referralPoints: number;
  referralCode?: string | null;
  createdAt: string;
  bonuses: Array<{
    id: string; status: string; pointsEarned: number; createdAt: string;
    bonusAction: { name: string; points: number };
  }>;
  redemptions: Array<{
    id: string; status: string; pointsSpent: number; createdAt: string;
    prize: { name: string };
  }>;
  predictions: Array<{
    id: string; pointsEarned: number; predictedOutcome?: string | null; createdAt: string;
    match: { matchCode: string; phase: string; homeTeam?: { name: string } | null; awayTeam?: { name: string } | null };
  }>;
  userAchievements: Array<{
    id: string; pointsEarned: number; awardedAt: string;
    achievementRule: { name: string; description: string };
  }>;
}

const STATUS_BADGE: Record<string, React.ReactElement> = {
  approved: <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Aprobado</Badge>,
  pending: <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>,
  rejected: <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>,
  delivered: <Badge variant="success">Entregado</Badge>,
};

export default function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("bonuses");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [manualPoints, setManualPoints] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/participants/${id}`)
      .then(r => r.json())
      .then(d => setUser(d.user))
      .finally(() => setLoading(false));
  }, [id]);

  const deleteBonus = async (bonusId: string) => {
    if (!confirm("¿Eliminar este canje de bonus? Los puntos serán recalculados.")) return;
    setDeleting(p => ({ ...p, [bonusId]: true }));
    const res = await fetch(`/api/admin/user-bonuses/${bonusId}`, { method: "DELETE" });
    if (res.ok) {
      setUser(u => u ? { ...u, bonuses: u.bonuses.filter(b => b.id !== bonusId) } : u);
      toast.success("Bonus eliminado");
    } else toast.error("Error al eliminar");
    setDeleting(p => ({ ...p, [bonusId]: false }));
  };

  const rejectBonus = async (bonusId: string) => {
    if (!confirm("¿Rechazar este bonus? Se quitarán los puntos.")) return;
    setDeleting(p => ({ ...p, [bonusId]: true }));
    const res = await fetch(`/api/admin/user-bonuses/${bonusId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(u => u ? { ...u, bonuses: u.bonuses.map(b => b.id === bonusId ? { ...b, status: "rejected", pointsEarned: 0 } : b) } : u);
      toast.success("Bonus rechazado");
    } else toast.error("Error");
    setDeleting(p => ({ ...p, [bonusId]: false }));
  };

  const deleteRedemption = async (rId: string) => {
    if (!confirm("¿Eliminar este canje? Los puntos gastados serán devueltos.")) return;
    setDeleting(p => ({ ...p, [rId]: true }));
    const res = await fetch(`/api/admin/redemptions/${rId}`, { method: "DELETE" });
    if (res.ok) {
      setUser(u => u ? { ...u, redemptions: u.redemptions.filter(r => r.id !== rId) } : u);
      toast.success("Canje eliminado, puntos devueltos");
    } else toast.error("Error al eliminar");
    setDeleting(p => ({ ...p, [rId]: false }));
  };

  const deleteItem = async (type: string, itemId: string, label: string) => {
    if (!confirm(`¿Eliminar esta ${label}?`)) return;
    setDeleting(p => ({ ...p, [itemId]: true }));
    const res = await fetch(`/api/admin/participants/${id}/items?type=${type}&itemId=${itemId}`, { method: "DELETE" });
    if (res.ok) {
      if (type === "prediction") setUser(u => u ? { ...u, predictions: u.predictions.filter(p => p.id !== itemId) } : u);
      toast.success("Eliminado");
    } else toast.error("Error al eliminar");
    setDeleting(p => ({ ...p, [itemId]: false }));
  };

  const addManualPoints = async () => {
    const pts = parseInt(manualPoints, 10);
    if (!pts || pts < 1) { toast.error("Ingresá una cantidad válida de puntos"); return; }
    setAddingPoints(true);
    try {
      const res = await fetch(`/api/admin/participants/${id}/manual-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: pts, note: manualNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      setUser(u => u ? { ...u, totalPoints: data.totalPoints, bonusPoints: data.bonusPoints } : u);
      setManualPoints("");
      setManualNote("");
      toast.success(`+${pts} puntos acreditados`);
    } catch { toast.error("Error de conexión"); }
    finally { setAddingPoints(false); }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <div className="text-gray-500 p-8">Usuario no encontrado</div>;

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "bonuses", label: "Bonus", count: user.bonuses.length, icon: <Zap className="w-4 h-4" /> },
    { key: "redemptions", label: "Premios", count: user.redemptions.length, icon: <Gift className="w-4 h-4" /> },
    { key: "predictions", label: "Predicciones", count: user.predictions.length, icon: <Target className="w-4 h-4" /> },
    { key: "achievements", label: "Logros", count: user.userAchievements.length, icon: <Medal className="w-4 h-4" /> },
  ];

  return (
    <div>
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a participantes
      </button>

      {/* Header */}
      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center text-lg font-black text-red-400 flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h1 className="text-white font-black text-xl">{user.firstName} {user.lastName}</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <p className="text-gray-600 text-xs mt-0.5">{user.phone}{user.instagram ? ` · @${user.instagram}` : ""}</p>
              {user.referralCode && (
                <p className="text-gray-700 text-xs mt-0.5">Código de invitación: <span className="text-gray-400 font-mono">{user.referralCode}</span></p>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total pts", value: user.totalPoints, color: "text-yellow-400" },
              { label: "Predicciones", value: user.predictionPoints, color: "text-blue-400" },
              { label: "Bonus", value: user.bonusPoints, color: "text-green-400" },
              { label: "Canjeados", value: user.spentPoints, color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="text-center px-3">
                <div className={`text-xl font-black ${s.color}`}>{s.value.toLocaleString("es-AR")}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Sumar puntos extra</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="w-28">
              <Input
                type="number"
                label="Puntos"
                placeholder="Ej: 500"
                value={manualPoints}
                onChange={e => setManualPoints(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[10rem]">
              <Input
                label="Nota interna (opcional)"
                placeholder="Motivo o descripción"
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
              />
            </div>
            <Button variant="primary" size="sm" loading={addingPoints} onClick={addManualPoints}>
              <Plus className="w-4 h-4" /> Sumar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 justify-center ${
              tab === t.key ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.icon} {t.label}
            <span className={`text-[10px] px-1 rounded-full ${tab === t.key ? "bg-red-700" : "bg-[#222]"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Bonus tab */}
      {tab === "bonuses" && (
        <div className="space-y-2">
          {user.bonuses.length === 0 && <Card className="p-6 text-center text-gray-600">Sin canjes de bonus</Card>}
          {user.bonuses.map(b => (
            <Card key={b.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold line-clamp-1">{b.bonusAction.name}</p>
                  <p className="text-gray-600 text-xs">{new Date(b.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-green-400 font-black text-sm">+{b.pointsEarned} pts</span>
                {STATUS_BADGE[b.status] ?? <Badge variant="default">{b.status}</Badge>}
                {b.status === "approved" && (
                  <button onClick={() => rejectBonus(b.id)} disabled={deleting[b.id]} className="text-orange-500 hover:text-orange-400 transition-colors disabled:opacity-40" title="Rechazar">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteBonus(b.id)} disabled={deleting[b.id]} className="text-gray-700 hover:text-red-400 transition-colors disabled:opacity-40" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Redemptions tab */}
      {tab === "redemptions" && (
        <div className="space-y-2">
          {user.redemptions.length === 0 && <Card className="p-6 text-center text-gray-600">Sin canjes de premios</Card>}
          {user.redemptions.map(r => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Gift className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold line-clamp-1">{r.prize.name}</p>
                  <p className="text-gray-600 text-xs">{new Date(r.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-red-400 font-black text-sm">-{r.pointsSpent} pts</span>
                {STATUS_BADGE[r.status] ?? <Badge variant="default">{r.status}</Badge>}
                <button onClick={() => deleteRedemption(r.id)} disabled={deleting[r.id]} className="text-gray-700 hover:text-red-400 transition-colors disabled:opacity-40" title="Eliminar y devolver puntos">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Predictions tab */}
      {tab === "predictions" && (
        <div className="space-y-2">
          {user.predictions.length === 0 && <Card className="p-6 text-center text-gray-600">Sin predicciones</Card>}
          {user.predictions.map(p => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold line-clamp-1">
                    {p.match.homeTeam?.name ?? "?"} vs {p.match.awayTeam?.name ?? "?"} — <span className="text-gray-400">{p.predictedOutcome ?? "sin resultado"}</span>
                  </p>
                  <p className="text-gray-600 text-xs">{p.match.phase} · {new Date(p.createdAt).toLocaleDateString("es-AR")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {p.pointsEarned > 0 && <span className="text-yellow-400 font-black text-sm">+{p.pointsEarned} pts</span>}
                <button onClick={() => deleteItem("prediction", p.id, "predicción")} disabled={deleting[p.id]} className="text-gray-700 hover:text-red-400 transition-colors disabled:opacity-40">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Achievements tab */}
      {tab === "achievements" && (
        <div className="space-y-2">
          {user.userAchievements.length === 0 && <Card className="p-6 text-center text-gray-600">Sin logros desbloqueados</Card>}
          {user.userAchievements.map(a => (
            <Card key={a.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Medal className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold">{a.achievementRule.name}</p>
                  <p className="text-gray-600 text-xs">{a.achievementRule.description}</p>
                </div>
              </div>
              <span className="text-yellow-400 font-black text-sm flex-shrink-0">+{a.pointsEarned} pts</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
