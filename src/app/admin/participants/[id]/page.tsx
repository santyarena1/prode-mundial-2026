"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Trophy, Star, Zap, Gift, Medal, Target, Trash2, CheckCircle2, XCircle, Clock, Plus, Minus, Coins, Users, Ticket, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PointsBreakdownSummary,
  type PointsLedgerCategory,
  type PointsLedgerEntry,
} from "@/lib/user-points-breakdown";

type Tab = "origen" | "bonuses" | "redemptions" | "predictions" | "achievements";

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
  achievementPoints: number;
  spentPoints: number;
  referralPoints: number;
  hardcoreMode?: boolean;
  emailVerified?: boolean;
  referralBonusAwarded?: boolean;
  referralCode?: string | null;
  referredBy?: {
    id: string;
    firstName: string;
    lastName: string;
    referralCode: string | null;
  } | null;
  referrals?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    emailVerified?: boolean;
    referralBonusAwarded?: boolean;
  }>;
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
    id: string; status: string; pointsEarned: number; predictedOutcome?: string | null; createdAt: string;
    match: { matchCode: string; phase: string; homeTeam?: { name: string } | null; awayTeam?: { name: string } | null };
  }>;
  groupPredictions: Array<{
    id: string; pointsEarned: number;
    group: { name: string };
    firstTeam?: { name: string; flag?: string | null } | null;
    secondTeam?: { name: string; flag?: string | null } | null;
    thirdTeam?: { name: string; flag?: string | null } | null;
  }>;
  bracketPredictions: Array<{
    id: string; phase: string; matchSlot: string; pointsEarned: number;
    predictedTeam?: { name: string; flag?: string | null } | null;
  }>;
  specialPredictions: Array<{
    id: string; type: string; predictedValue: string; pointsEarned: number;
  }>;
  userAchievements: Array<{
    id: string; pointsEarned: number; awardedAt: string;
    achievementRule: { name: string; description: string };
  }>;
}

interface PointsBreakdownData {
  summary: PointsBreakdownSummary;
  ledger: PointsLedgerEntry[];
  referredBy: UserDetail["referredBy"];
  referrals: NonNullable<UserDetail["referrals"]>;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado",
  redeemed: "Canjeado",
  available: "Disponible",
  delivered: "Entregado",
};

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
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("origen");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [manualPoints, setManualPoints] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  const loadParticipant = () =>
    fetch(`/api/admin/participants/${id}`)
      .then(r => r.json())
      .then(d => {
        setUser(d.user);
        setPointsBreakdown(d.pointsBreakdown ?? null);
      });

  useEffect(() => {
    loadParticipant().finally(() => setLoading(false));
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

  const applyManualPoints = async (operation: "add" | "subtract") => {
    const pts = parseInt(manualPoints, 10);
    if (!pts || pts < 1) { toast.error("Ingresá una cantidad válida de puntos"); return; }
    setAddingPoints(true);
    try {
      const res = await fetch(`/api/admin/participants/${id}/manual-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: pts, operation, note: manualNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      await loadParticipant();
      setManualPoints("");
      setManualNote("");
      toast.success(operation === "add" ? `+${pts} puntos acreditados` : `-${pts} puntos descontados`);
    } catch { toast.error("Error de conexión"); }
    finally { setAddingPoints(false); }
  };

  const deleteUser = async () => {
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Error al eliminar el usuario"); return; }
      toast.success("Usuario eliminado");
      router.push("/admin/participants");
    } catch { toast.error("Error de conexión"); }
    finally { setDeletingUser(false); }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <div className="text-gray-500 p-8">Usuario no encontrado</div>;

  const lockedPredictions = user.predictions.filter(p => p.status === "locked");
  const totalPredictionCount =
    lockedPredictions.length +
    (user.groupPredictions?.length ?? 0) +
    (user.bracketPredictions?.length ?? 0) +
    (user.specialPredictions?.length ?? 0);

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "origen", label: "Origen", count: pointsBreakdown?.ledger.filter(e => !e.id.startsWith("summary-")).length ?? 0, icon: <Coins className="w-4 h-4" /> },
    { key: "bonuses", label: "Bonus", count: user.bonuses.length, icon: <Zap className="w-4 h-4" /> },
    { key: "redemptions", label: "Premios", count: user.redemptions.length, icon: <Gift className="w-4 h-4" /> },
    { key: "predictions", label: "Predicciones", count: totalPredictionCount, icon: <Target className="w-4 h-4" /> },
    { key: "achievements", label: "Logros", count: user.userAchievements.length, icon: <Medal className="w-4 h-4" /> },
  ];

  return (
    <div>
      {/* Back */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a participantes
        </button>
        <button
          onClick={() => { setDeleteConfirm(""); setShowDeleteModal(true); }}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar usuario
        </button>
      </div>

      {/* Header */}
      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center text-lg font-black text-red-400 flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white font-black text-xl">{user.firstName} {user.lastName}</h1>
                {user.emailVerified ? (
                  <Badge variant="success">Email verificado</Badge>
                ) : (
                  <Badge variant="warning">Email sin verificar</Badge>
                )}
                {user.referredBy && (
                  user.referralBonusAwarded ? (
                    <Badge variant="info">Bonus referido OK</Badge>
                  ) : (
                    <Badge variant="default">Bonus referido pendiente</Badge>
                  )
                )}
              </div>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <p className="text-gray-600 text-xs mt-0.5">{user.phone}{user.instagram ? ` · @${user.instagram}` : ""}</p>
              {user.referralCode && (
                <p className="text-gray-700 text-xs mt-0.5">Código de invitación: <span className="text-gray-400 font-mono">{user.referralCode}</span></p>
              )}
              {user.referredBy && (
                <p className="text-gray-700 text-xs mt-0.5">
                  Se registró con el código de{" "}
                  <Link href={`/admin/participants/${user.referredBy.id}`} className="text-emerald-500 hover:text-emerald-400">
                    {user.referredBy.firstName} {user.referredBy.lastName}
                  </Link>
                  {user.referredBy.referralCode ? ` (${user.referredBy.referralCode})` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total pts", value: user.totalPoints, color: "text-yellow-400" },
              { label: "Disponibles", value: (user.totalPoints - user.spentPoints), color: "text-lime-400" },
              { label: "Predicciones", value: user.predictionPoints, color: "text-blue-400" },
              { label: "Bonus", value: user.bonusPoints, color: "text-green-400" },
              ...(user.achievementPoints > 0 ? [{ label: "Logros", value: user.achievementPoints, color: "text-amber-400" }] : []),
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
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Ajuste manual de puntos</p>
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
            <Button variant="primary" size="sm" loading={addingPoints} onClick={() => applyManualPoints("add")}>
              <Plus className="w-4 h-4" /> Sumar
            </Button>
            <Button variant="secondary" size="sm" loading={addingPoints} onClick={() => applyManualPoints("subtract")}>
              <Minus className="w-4 h-4" /> Restar
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

      {/* Origen de puntos tab */}
      {tab === "origen" && pointsBreakdown && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "Partidos", value: pointsBreakdown.summary.predictionMatches, color: "text-blue-400" },
              { label: "Grupos", value: pointsBreakdown.summary.predictionGroups, color: "text-purple-400" },
              { label: "Eliminatorias", value: pointsBreakdown.summary.predictionBracket, color: "text-orange-400" },
              { label: "Bonus / acciones", value: pointsBreakdown.summary.bonusActionPoints + pointsBreakdown.summary.referralReceivedPoints + pointsBreakdown.summary.manualAdminPoints, color: "text-green-400" },
              { label: "Códigos", value: pointsBreakdown.summary.purchaseCodePoints, color: "text-pink-400" },
              { label: "Referidos", value: pointsBreakdown.summary.referralPoints, color: "text-teal-400" },
            ].map(item => (
              <Card key={item.label} className="p-3 text-center">
                <div className={`text-lg font-black ${item.color}`}>{item.value.toLocaleString("es-AR")}</div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{item.label}</div>
              </Card>
            ))}
          </div>

          {(user.referrals?.length ?? 0) > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Invitó a {user.referrals!.length} {user.referrals!.length === 1 ? "persona" : "personas"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Verificado
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Sin verificar
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.referrals!.map(ref => {
                  const verified = ref.emailVerified && ref.referralBonusAwarded;
                  return (
                    <Link
                      key={ref.id}
                      href={`/admin/participants/${ref.id}`}
                      className={`text-xs px-2.5 py-1 rounded-lg border-2 transition-colors flex items-center gap-1.5 ${
                        verified
                          ? "bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/50"
                          : "bg-amber-900/30 border-amber-500 text-amber-300 hover:bg-amber-900/50"
                      }`}
                      title={verified ? "Email verificado — bonus acreditado" : "Email sin verificar — bonus pendiente"}
                    >
                      {verified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {ref.firstName} {ref.lastName}
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Historial de puntos</h3>
            </div>
            {pointsBreakdown.ledger.length === 0 ? (
              <Card className="p-6 text-center text-gray-600">Sin movimientos de puntos registrados</Card>
            ) : (
              <div className="space-y-1.5">
                {pointsBreakdown.ledger.map(entry => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
        <div className="space-y-6">
          {totalPredictionCount === 0 && (
            <Card className="p-6 text-center text-gray-600">Sin predicciones guardadas</Card>
          )}

          {/* ── Partidos de grupos ── */}
          {lockedPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Partidos de grupos</h3>
                <span className="text-xs text-gray-600 ml-1">({lockedPredictions.length})</span>
                <span className="ml-auto text-xs text-yellow-500 font-bold">
                  {lockedPredictions.reduce((s, p) => s + p.pointsEarned, 0).toLocaleString("es-AR")} pts ganados
                </span>
              </div>
              <div className="space-y-1">
                {lockedPredictions.map(p => {
                  const outcome = p.predictedOutcome;
                  const outcomeLabel =
                    outcome === "home" ? `Local (${p.match.homeTeam?.name ?? "?"})` :
                    outcome === "away" ? `Visitante (${p.match.awayTeam?.name ?? "?"})` :
                    outcome === "draw" ? "Empate" : outcome ?? "—";
                  const outcomeColor =
                    outcome === "home" ? "text-green-400" :
                    outcome === "away" ? "text-orange-400" :
                    outcome === "draw" ? "text-yellow-400" : "text-gray-500";
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors">
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-white text-xs font-medium truncate">
                          {p.match.homeTeam?.name ?? "?"} <span className="text-gray-600">vs</span> {p.match.awayTeam?.name ?? "?"}
                        </span>
                        <span className="text-[10px] text-gray-700">·</span>
                        <span className={`text-xs font-semibold ${outcomeColor} flex-shrink-0`}>{outcomeLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.pointsEarned > 0
                          ? <span className="text-yellow-400 text-xs font-bold">+{p.pointsEarned.toLocaleString("es-AR")}</span>
                          : <span className="text-gray-700 text-xs">0 pts</span>
                        }
                        <button onClick={() => deleteItem("prediction", p.id, "predicción")} disabled={deleting[p.id]} className="text-gray-800 hover:text-red-400 transition-colors disabled:opacity-40 ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Posiciones de grupos ── */}
          {(user.groupPredictions?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-purple-500 rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Posiciones de grupos</h3>
                <span className="text-xs text-gray-600 ml-1">({user.groupPredictions.length})</span>
                <span className="ml-auto text-xs text-yellow-500 font-bold">
                  {user.groupPredictions.reduce((s, g) => s + g.pointsEarned, 0).toLocaleString("es-AR")} pts ganados
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {user.groupPredictions.map(gp => (
                  <div key={gp.id} className="px-3 py-2.5 rounded-lg bg-[#111] border border-[#1a1a1a]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{gp.group.name}</span>
                      {gp.pointsEarned > 0
                        ? <span className="text-yellow-400 text-xs font-bold">+{gp.pointsEarned.toLocaleString("es-AR")}</span>
                        : <span className="text-gray-700 text-xs">0 pts</span>
                      }
                    </div>
                    <div className="space-y-1">
                      {gp.firstTeam && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-yellow-500 w-4">1°</span>
                          <span className="text-white text-xs">{gp.firstTeam.name}</span>
                        </div>
                      )}
                      {gp.secondTeam && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 w-4">2°</span>
                          <span className="text-white text-xs">{gp.secondTeam.name}</span>
                        </div>
                      )}
                      {gp.thirdTeam && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-600 w-4">3°</span>
                          <span className="text-gray-400 text-xs">{gp.thirdTeam.name}</span>
                        </div>
                      )}
                      {!gp.firstTeam && !gp.secondTeam && (
                        <span className="text-gray-700 text-xs">Sin predicción</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Eliminatorias ── */}
          {(user.bracketPredictions?.length ?? 0) > 0 && (() => {
            const PHASE_ORDER = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "RUNNER_UP", "CHAMPION"];
            const PHASE_LABEL: Record<string, string> = {
              ROUND_OF_32: "Ronda de 32", ROUND_OF_16: "Octavos", QUARTER_FINALS: "Cuartos",
              SEMI_FINALS: "Semifinal", RUNNER_UP: "Subcampeón", CHAMPION: "Campeón",
            };
            const byPhase = PHASE_ORDER.reduce((acc, ph) => {
              const items = user.bracketPredictions.filter(b => b.phase === ph);
              if (items.length) acc[ph] = items;
              return acc;
            }, {} as Record<string, typeof user.bracketPredictions>);

            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Eliminatorias</h3>
                  <span className="text-xs text-gray-600 ml-1">({user.bracketPredictions.length})</span>
                  <span className="ml-auto text-xs text-yellow-500 font-bold">
                    {user.bracketPredictions.reduce((s, b) => s + b.pointsEarned, 0).toLocaleString("es-AR")} pts ganados
                  </span>
                </div>
                <div className="space-y-3">
                  {PHASE_ORDER.filter(ph => byPhase[ph]).map(ph => (
                    <div key={ph}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5 pl-1">{PHASE_LABEL[ph]}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {byPhase[ph].map(b => (
                          <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#1a1a1a]">
                            <span className="text-white text-xs font-medium truncate">
                              {b.predictedTeam?.name ?? <span className="text-gray-600 italic">Sin predicción</span>}
                            </span>
                            {b.pointsEarned > 0
                              ? <span className="text-yellow-400 text-xs font-bold flex-shrink-0">+{b.pointsEarned.toLocaleString("es-AR")}</span>
                              : <span className="text-gray-700 text-xs flex-shrink-0">0</span>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Especiales ── */}
          {(user.specialPredictions?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-yellow-500 rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Predicciones especiales</h3>
              </div>
              <div className="space-y-1">
                {user.specialPredictions.map(sp => (
                  <div key={sp.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#111] border border-[#1a1a1a]">
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wider">{sp.type}</p>
                      <p className="text-white text-sm font-semibold">{sp.predictedValue}</p>
                    </div>
                    {sp.pointsEarned > 0
                      ? <span className="text-yellow-400 text-sm font-bold">+{sp.pointsEarned.toLocaleString("es-AR")}</span>
                      : <span className="text-gray-700 text-xs">0 pts</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Delete user modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-red-500/30 rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold">Eliminar usuario</p>
                <p className="text-sm text-gray-400 mt-1">
                  Se eliminarán permanentemente todos los datos de{" "}
                  <strong className="text-white">{user.firstName} {user.lastName}</strong>:
                  predicciones, puntos, canjes, bonuses y logros.
                  Esta acción <strong className="text-red-400">no se puede deshacer</strong>.
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">
                Escribí <span className="text-white font-mono">{user.firstName} {user.lastName}</span> para confirmar
              </label>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={`${user.firstName} ${user.lastName}`}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <button
                disabled={deleteConfirm !== `${user.firstName} ${user.lastName}` || deletingUser}
                onClick={deleteUser}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingUser ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerRow({ entry }: { entry: PointsLedgerEntry }) {
  const isSummary = entry.id.startsWith("summary-");
  const categoryLabel = CATEGORY_LABELS[entry.category as PointsLedgerCategory];
  const categoryColor = CATEGORY_COLORS[entry.category as PointsLedgerCategory];
  const dateLabel = isSummary
    ? "Resumen"
    : new Date(entry.date).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <Card className={`p-3.5 flex items-center justify-between gap-3 flex-wrap ${isSummary ? "border-dashed border-[#333]" : ""}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 ${categoryColor}`}>
          {entry.category === "purchase_code" ? <Ticket className="w-4 h-4" /> :
           entry.category === "referral_given" || entry.category === "referral_received" ? <Users className="w-4 h-4" /> :
           entry.category === "redemption" ? <Gift className="w-4 h-4" /> :
           entry.category.startsWith("prediction_") ? <Target className="w-4 h-4" /> :
           entry.category === "achievement" ? <Medal className="w-4 h-4" /> :
           <Zap className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-semibold">{entry.label}</p>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${categoryColor} bg-[#1a1a1a]`}>
              {categoryLabel}
            </span>
          </div>
          {entry.detail && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{entry.detail}</p>
          )}
          <p className="text-gray-700 text-[10px] mt-0.5">{dateLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {entry.points !== 0 ? (
          <span className={`font-black text-sm ${entry.points > 0 ? "text-green-400" : "text-red-400"}`}>
            {entry.points > 0 ? "+" : ""}{entry.points.toLocaleString("es-AR")} pts
          </span>
        ) : (
          <span className="text-gray-600 text-xs">0 pts</span>
        )}
        {entry.status && entry.status !== "approved" && entry.status !== "redeemed" && (
          <Badge variant={entry.status === "pending" ? "warning" : entry.status === "rejected" ? "error" : "default"}>
            {STATUS_LABEL[entry.status] ?? entry.status}
          </Badge>
        )}
      </div>
    </Card>
  );
}
