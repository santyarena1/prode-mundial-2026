"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, Plus, X, Mail, Trash2, Settings, Gift, Target,
  Copy, ChevronRight, Crown, LogOut, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface Member {
  id: string;
  userId: string;
  role: string;
  totalPoints: number;
  spentPoints: number;
  user: { id: string; firstName: string; lastName: string; instagram?: string };
}

interface Prize {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  stock: number;
  active: boolean;
  _count: { redemptions: number };
}

interface Squad {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  isHardcore: boolean;
  createdBy: string;
  creator: { id: string; firstName: string; lastName: string };
  members: Member[];
  prizes: Prize[];
}

type Tab = "ranking" | "prizes" | "settings";

export default function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [myMemberId, setMyMemberId] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [rules, setRules] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("ranking");

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Prize create
  const [showAddPrize, setShowAddPrize] = useState(false);
  const [prizeForm, setPrizeForm] = useState({ name: "", description: "", pointsCost: "", stock: "" });
  const [creatingPrize, setCreatingPrize] = useState(false);

  // Redeem
  const [redeeming, setRedeeming] = useState<Record<string, boolean>>({});

  // Leave/dissolve
  const [leaving, setLeaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}`);
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 403) { router.push("/squads"); return; }
      if (res.ok) {
        const data = await res.json();
        setSquad(data.squad);
        setMyMemberId(data.myMemberId);
        setMyRole(data.myRole);
        setRules(data.rules);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al invitar"); return; }
      toast.success("¡Invitación enviada!");
      setInviteEmail("");
      setShowInvite(false);
    } finally {
      setInviting(false);
    }
  };

  const createPrize = async () => {
    if (!prizeForm.name || !prizeForm.pointsCost) { toast.error("Completá nombre y puntos"); return; }
    setCreatingPrize(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prizeForm.name,
          description: prizeForm.description || undefined,
          pointsCost: parseInt(prizeForm.pointsCost),
          stock: prizeForm.stock ? parseInt(prizeForm.stock) : -1,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      toast.success("Premio creado");
      setShowAddPrize(false);
      setPrizeForm({ name: "", description: "", pointsCost: "", stock: "" });
      load();
    } finally {
      setCreatingPrize(false);
    }
  };

  const deletePrize = async (prizeId: string) => {
    if (!confirm("¿Eliminar este premio?")) return;
    await apiFetch(`/api/participant/squads/${id}/prizes/${prizeId}`, { method: "DELETE" });
    load();
  };

  const redeemPrize = async (prizeId: string) => {
    setRedeeming((p) => ({ ...p, [prizeId]: true }));
    try {
      const res = await apiFetch(`/api/participant/squads/${id}/prizes/${prizeId}/redeem`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      toast.success("¡Premio reclamado! Queda pendiente de confirmación del admin.");
    } finally {
      setRedeeming((p) => ({ ...p, [prizeId]: false }));
    }
  };

  const leaveOrDissolve = async () => {
    const isCreator = squad?.createdBy === squad?.members.find((m) => m.id === myMemberId)?.userId;
    const msg = isCreator
      ? "¿Disolver el grupo? Se eliminará para todos los miembros."
      : "¿Salir del grupo?";
    if (!confirm(msg)) return;
    setLeaving(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(isCreator ? "Grupo disuelto" : "Saliste del grupo");
        router.push("/squads");
      }
    } finally {
      setLeaving(false);
    }
  };

  const copyCode = () => {
    if (!squad) return;
    navigator.clipboard.writeText(squad.inviteCode);
    toast.success("Código copiado");
  };

  if (loading) return <LoadingScreen />;
  if (!squad) return null;

  const isAdmin = myRole === "admin";
  const myMember = squad.members.find((m) => m.id === myMemberId);
  const availablePoints = (myMember?.totalPoints ?? 0) - (myMember?.spentPoints ?? 0);

  const RULE_META: Record<string, { label: string; desc: string }> = {
    GROUP_SIGN:       { label: "Acertar el resultado", desc: "Ganaste puntos si predijiste quién ganó o si fue empate (sin importar el marcador exacto)" },
    GROUP_DRAW_BONUS: { label: "Bonus por empate", desc: "Puntos extra cuando predijiste empate Y el partido terminó empatado" },
    EXACT_SCORE:      { label: "Marcador exacto", desc: "Bonus adicional por acertar el resultado Y los goles exactos de cada equipo (modo Hardcore)" },
    GROUP_CLASSIFIED: { label: "Equipo clasificado del grupo", desc: "Puntos por cada equipo que predijiste que pasaba de fase, sin importar la posición" },
    GROUP_POSITION:   { label: "Posición exacta en el grupo", desc: "Puntos extra si acertaste que ese equipo salió primero o segundo en su grupo específicamente" },
    ROUND_OF_32:      { label: "Equipo que pasa en 16vos", desc: "Por cada equipo que predijiste correctamente que avanzaba desde la ronda de 32" },
    ROUND_OF_16:      { label: "Equipo que pasa en Octavos", desc: "Por cada equipo que predijiste correctamente que avanzaba desde los octavos de final" },
    QUARTER_FINALS:   { label: "Equipo que pasa en Cuartos", desc: "Por cada equipo que predijiste correctamente que avanzaba desde los cuartos de final" },
    SEMI_FINALS:      { label: "Equipo que pasa en Semis", desc: "Por cada equipo que predijiste correctamente que pasaba a la final desde las semifinales" },
    CHAMPION:         { label: "Campeón del mundo", desc: "Si predijiste al campeón antes de que arrancara el torneo" },
    RUNNER_UP:        { label: "Finalista (subcampeón)", desc: "Si predijiste correctamente al equipo que llegó a la final pero no ganó" },
    FINAL_EXACT:      { label: "Final perfecta", desc: "Bonus especial por acertar al campeón Y al finalista exactamente (se suma a los puntos de campeón y finalista)" },
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-white">{squad.name}</h1>
                  {squad.isHardcore && <Badge variant="error">Hardcore</Badge>}
                </div>
                {squad.description && (
                  <p className="text-gray-500 text-sm mt-0.5">{squad.description}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">
                  <Users className="w-3 h-3 inline mr-1" />{squad.members.length} miembros
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
                  <Mail className="w-4 h-4" /> Invitar
                </Button>
                <Link href={`/squads/${id}/predictions`}>
                  <Button variant="primary" size="sm">
                    <Target className="w-4 h-4" /> Mis preds
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-gray-600 text-xs font-mono">{squad.inviteCode}</span>
              <button onClick={copyCode} className="text-gray-600 hover:text-white">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-5">
            {(["ranking", "prizes", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  tab === t ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "ranking" ? "Ranking" : t === "prizes" ? "Premios" : "Config"}
              </button>
            ))}
          </div>

          {/* Ranking tab */}
          {tab === "ranking" && (
            <div className="space-y-2">
              {squad.members.map((m, i) => (
                <Card key={m.id} className={`p-4 ${m.id === myMemberId ? "border-red-600/40" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      i === 1 ? "bg-gray-400/20 text-gray-300" :
                      i === 2 ? "bg-orange-700/20 text-orange-500" :
                      "bg-[#1a1a1a] text-gray-600"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold truncate">
                          {m.user.firstName} {m.user.lastName}
                        </span>
                        {m.role === "admin" && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                        {m.id === myMemberId && <span className="text-xs text-gray-600">(vos)</span>}
                      </div>
                    </div>
                    <span className="text-yellow-500 font-black text-sm">{m.totalPoints} pts</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Prizes tab */}
          {tab === "prizes" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-gray-400 text-sm">Tus puntos disponibles:</p>
                  <p className="text-yellow-400 font-black text-xl">{availablePoints} pts</p>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAddPrize(true)}>
                    <Plus className="w-4 h-4" /> Agregar premio
                  </Button>
                )}
              </div>

              {squad.prizes.length === 0 && (
                <Card className="p-8 text-center text-gray-500 text-sm">
                  {isAdmin
                    ? "No hay premios. ¡Agregá uno para que tus amigos puedan canjear!"
                    : "El admin del grupo todavía no agregó premios."}
                </Card>
              )}

              {squad.prizes.map((prize) => {
                const canRedeem = availablePoints >= prize.pointsCost &&
                  (prize.stock < 0 || prize._count.redemptions < prize.stock);
                return (
                  <Card key={prize.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{prize.name}</span>
                          <Badge variant="success" className="text-[10px]">
                            {prize.pointsCost} pts
                          </Badge>
                        </div>
                        {prize.description && (
                          <p className="text-gray-500 text-xs mt-0.5">{prize.description}</p>
                        )}
                        {prize.stock >= 0 && (
                          <p className="text-gray-600 text-xs mt-1">
                            Stock: {Math.max(0, prize.stock - prize._count.redemptions)}/{prize.stock}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button onClick={() => deletePrize(prize.id)} className="text-gray-600 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          loading={redeeming[prize.id]}
                          disabled={!canRedeem}
                          onClick={() => redeemPrize(prize.id)}
                          className={canRedeem ? "" : "opacity-40 cursor-not-allowed"}
                        >
                          <Gift className="w-3 h-3" /> Canjear
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Settings tab */}
          {tab === "settings" && (
            <div className="space-y-4">
              {/* Point rules */}
              <Card className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Reglas de puntos
                </h3>
                <PointRulesEditor
                  squadId={id}
                  rules={rules}
                  meta={RULE_META}
                  isAdmin={isAdmin}
                  onSaved={(r) => setRules(r)}
                />
              </Card>

              {/* Danger zone */}
              <Card className="p-5 border-red-900/40">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-3">
                  Zona peligrosa
                </h3>
                <Button
                  variant="danger"
                  size="sm"
                  loading={leaving}
                  onClick={leaveOrDissolve}
                >
                  <LogOut className="w-4 h-4" />
                  {squad.createdBy === myMember?.userId ? "Disolver grupo" : "Salir del grupo"}
                </Button>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
              onClick={() => setShowInvite(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-black text-lg">Invitar amigo</h2>
                  <button onClick={() => setShowInvite(false)} className="text-gray-600 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Input
                  label="Email del amigo"
                  type="email"
                  placeholder="amigo@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                />
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" loading={inviting} onClick={sendInvite} className="flex-1">
                    Invitar
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add prize modal */}
      <AnimatePresence>
        {showAddPrize && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
              onClick={() => setShowAddPrize(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-black text-lg">Nuevo premio</h2>
                  <button onClick={() => setShowAddPrize(false)} className="text-gray-600 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 mb-4">
                  <Input
                    label="Nombre del premio"
                    placeholder="Ej: Cerveza gratis"
                    value={prizeForm.name}
                    onChange={(e) => setPrizeForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label="Descripción (opcional)"
                    placeholder="Detalles..."
                    value={prizeForm.description}
                    onChange={(e) => setPrizeForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <Input
                    type="number"
                    label="Puntos requeridos"
                    placeholder="Ej: 5000"
                    value={prizeForm.pointsCost}
                    onChange={(e) => setPrizeForm((p) => ({ ...p, pointsCost: e.target.value }))}
                  />
                  <Input
                    type="number"
                    label="Stock (vacío = ilimitado)"
                    placeholder="Ej: 1"
                    value={prizeForm.stock}
                    onChange={(e) => setPrizeForm((p) => ({ ...p, stock: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddPrize(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" loading={creatingPrize} onClick={createPrize} className="flex-1">
                    Crear
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function PointRulesEditor({
  squadId,
  rules,
  meta,
  isAdmin,
  onSaved,
}: {
  squadId: string;
  rules: Record<string, number>;
  meta: Record<string, { label: string; desc: string }>;
  isAdmin: boolean;
  onSaved: (rules: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, String(v)]))
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/participant/squads/${squadId}/point-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: Object.entries(draft).map(([key, v]) => ({ key, points: parseInt(v) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      onSaved(data.rules);
      toast.success("Reglas guardadas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(rules).map(([key]) => (
        <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-[#1a1a1a] last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">{meta[key]?.label ?? key}</p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{meta[key]?.desc}</p>
          </div>
          {isAdmin ? (
            <input
              type="number"
              className="w-24 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-white text-sm text-right flex-shrink-0"
              value={draft[key] ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
            />
          ) : (
            <span className="text-yellow-500 font-bold text-sm flex-shrink-0">{rules[key]} pts</span>
          )}
        </div>
      ))}
      {isAdmin && (
        <Button variant="primary" size="sm" loading={saving} onClick={save} className="mt-2">
          Guardar reglas
        </Button>
      )}
    </div>
  );
}
