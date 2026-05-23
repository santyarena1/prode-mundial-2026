"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, Save, X, Trophy, Clock, Shuffle, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface BonusAction {
  id: string;
  name: string;
  points: number;
  allowMultipleClaims: boolean;
}

interface WeeklyRaffle {
  id: string;
  title: string;
  description?: string | null;
  prize: string;
  scheduledAt: string;
  status: string;
  winnerName?: string | null;
  winnerInstagram?: string | null;
  bonusActionId?: string | null;
  earlyBirdCutoff?: string | null;
}

interface Participant {
  user: { id: string; firstName: string; lastName: string; email: string; instagram?: string | null };
  entries: number;
}

const STATUSES = [
  { value: "upcoming", label: "Próximo", variant: "info" as const },
  { value: "live", label: "En vivo", variant: "warning" as const },
  { value: "completed", label: "Realizado", variant: "success" as const },
  { value: "cancelled", label: "Cancelado", variant: "error" as const },
];

const emptyForm = {
  title: "", description: "", prize: "", scheduledAt: "", status: "upcoming",
  winnerName: "", winnerInstagram: "", bonusActionId: "", earlyBirdCutoff: "",
};

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<WeeklyRaffle[]>([]);
  const [bonusActions, setBonusActions] = useState<BonusAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [drawRaffle, setDrawRaffle] = useState<WeeklyRaffle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<Participant | null>(null);
  const [savingWinner, setSavingWinner] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/raffles").then((r) => r.json()),
      fetch("/api/admin/bonus-actions").then((r) => r.json()),
    ]).then(([rd, bd]) => {
      setRaffles(rd.raffles || []);
      setBonusActions(bd.bonusActions || []);
    }).finally(() => setLoading(false));
  }, []);

  const openDraw = async (r: WeeklyRaffle) => {
    setDrawRaffle(r);
    setSelectedWinner(null);
    setLoadingParticipants(true);
    const res = await fetch(`/api/admin/raffles/${r.id}/participants`);
    if (res.ok) {
      const data = await res.json();
      setParticipants(data.participants || []);
    }
    setLoadingParticipants(false);
  };

  const pickRandom = () => {
    if (participants.length === 0) return;
    // Build weighted pool
    const pool: Participant[] = [];
    for (const p of participants) {
      for (let i = 0; i < p.entries; i++) pool.push(p);
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    setSelectedWinner(winner);
  };

  const confirmWinner = async () => {
    if (!drawRaffle || !selectedWinner) return;
    setSavingWinner(true);
    const res = await fetch(`/api/admin/raffles/${drawRaffle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winnerName: `${selectedWinner.user.firstName} ${selectedWinner.user.lastName}`,
        winnerInstagram: selectedWinner.user.instagram || null,
        status: "completed",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRaffles((prev) => prev.map((r) => r.id === drawRaffle.id ? data.raffle : r));
      setDrawRaffle(null);
      toast.success(`¡Ganador guardado: ${selectedWinner.user.firstName} ${selectedWinner.user.lastName}!`);
    } else {
      toast.error("Error al guardar ganador");
    }
    setSavingWinner(false);
  };

  const createRaffle = async () => {
    if (!form.title || !form.prize || !form.scheduledAt) {
      toast.error("Título, premio y fecha son requeridos");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bonusActionId: form.bonusActionId || null,
          earlyBirdCutoff: form.earlyBirdCutoff || null,
          winnerName: form.winnerName || null,
          winnerInstagram: form.winnerInstagram || null,
          description: form.description || null,
        }),
      });
      if (!res.ok) { toast.error("Error al crear sorteo"); return; }
      const data = await res.json();
      setRaffles((prev) => [data.raffle, ...prev]);
      setForm(emptyForm);
      setShowCreate(false);
      toast.success("Sorteo creado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (r: WeeklyRaffle) => {
    setEditingId(r.id);
    setEditForm({
      title: r.title,
      description: r.description || "",
      prize: r.prize,
      scheduledAt: new Date(r.scheduledAt).toISOString().slice(0, 16),
      status: r.status,
      winnerName: r.winnerName || "",
      winnerInstagram: r.winnerInstagram || "",
      bonusActionId: r.bonusActionId || "",
      earlyBirdCutoff: r.earlyBirdCutoff ? new Date(r.earlyBirdCutoff).toISOString().slice(0, 16) : "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving((p) => ({ ...p, [editingId]: true }));
    try {
      const res = await fetch(`/api/admin/raffles/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          bonusActionId: editForm.bonusActionId || null,
          earlyBirdCutoff: editForm.earlyBirdCutoff || null,
          winnerName: editForm.winnerName || null,
          winnerInstagram: editForm.winnerInstagram || null,
          description: editForm.description || null,
        }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      const data = await res.json();
      setRaffles((prev) => prev.map((r) => r.id === editingId ? data.raffle : r));
      setEditingId(null);
      toast.success("Sorteo actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving((p) => ({ ...p, [editingId!]: false }));
    }
  };

  const deleteRaffle = async (id: string) => {
    if (!confirm("¿Eliminar este sorteo?")) return;
    const res = await fetch(`/api/admin/raffles/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setRaffles((prev) => prev.filter((r) => r.id !== id));
    toast.success("Sorteo eliminado");
  };

  if (loading) return <LoadingScreen />;

  const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

  const RaffleForm = ({ f, set }: { f: typeof emptyForm; set: (v: typeof emptyForm) => void }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input label="Título" placeholder="Ej: Sorteo Semana 1" value={f.title} onChange={(e) => set({ ...f, title: e.target.value })} />
      <Input label="Premio" placeholder="Ej: Auriculares gaming" value={f.prize} onChange={(e) => set({ ...f, prize: e.target.value })} />
      <Input label="Fecha y hora del sorteo" type="datetime-local" value={f.scheduledAt} onChange={(e) => set({ ...f, scheduledAt: e.target.value })} />
      <div>
        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Estado</label>
        <select value={f.status} onChange={(e) => set({ ...f, status: e.target.value })}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Cupón del sorteo (Bonus Action)</label>
        <select value={f.bonusActionId} onChange={(e) => set({ ...f, bonusActionId: e.target.value })}
          className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
          <option value="">— Sin cupón vinculado —</option>
          {bonusActions.map((a) => (
            <option key={a.id} value={a.id}>{a.name} {a.allowMultipleClaims ? "(múltiples entradas)" : ""}</option>
          ))}
        </select>
        <p className="text-gray-700 text-xs mt-1">El cupón que los usuarios reclamarán para participar. Activá "múltiples reclamos" en la acción para que puedan obtener más entradas.</p>
      </div>
      <div>
        <Input label="Early bird: cierre de inscripción gratuita" type="datetime-local" value={f.earlyBirdCutoff} onChange={(e) => set({ ...f, earlyBirdCutoff: e.target.value })} />
        <p className="text-gray-700 text-xs mt-1">Usuarios que se registren ANTES de esta fecha reciben una entrada automática.</p>
      </div>
      <textarea placeholder="Descripción (opcional)" value={f.description}
        onChange={(e) => set({ ...f, description: e.target.value })} rows={2}
        className="sm:col-span-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none" />
      <Input label="Nombre del ganador" placeholder="Dejar vacío si no hay aún" value={f.winnerName} onChange={(e) => set({ ...f, winnerName: e.target.value })} />
      <Input label="Instagram del ganador (sin @)" placeholder="usuario_ig" value={f.winnerInstagram} onChange={(e) => set({ ...f, winnerInstagram: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Sorteos semanales</h1>
          <p className="text-gray-500 text-sm">{raffles.length} sorteos configurados</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4" /> Nuevo sorteo
        </Button>
      </div>

      {showCreate && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nuevo sorteo</h3>
          <RaffleForm f={form} set={setForm} />
          <div className="flex gap-2 mt-4">
            <Button variant="primary" size="sm" loading={creating} onClick={createRaffle}>
              <Plus className="w-4 h-4" /> Crear sorteo
            </Button>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white px-3">Cancelar</button>
          </div>
        </Card>
      )}

      {raffles.length === 0 && (
        <Card className="p-10 text-center">
          <Shuffle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No hay sorteos configurados todavía.</p>
        </Card>
      )}

      <div className="space-y-3">
        {raffles.map((r) => {
          const linkedAction = bonusActions.find((a) => a.id === r.bonusActionId);
          return (
            <Card key={r.id} className="p-5">
              {editingId === r.id ? (
                <div className="space-y-4">
                  <RaffleForm f={editForm} set={setEditForm} />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" loading={saving[r.id]} onClick={saveEdit}>
                      <Save className="w-4 h-4" /> Guardar
                    </Button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-bold">{r.title}</h3>
                      <Badge variant={statusInfo(r.status).variant}>{statusInfo(r.status).label}</Badge>
                    </div>
                    <p className="text-red-400 text-sm font-semibold mb-1">🎁 {r.prize}</p>
                    {r.description && <p className="text-gray-500 text-xs mb-1">{r.description}</p>}
                    <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                      <Clock className="w-3 h-3" />
                      {new Date(r.scheduledAt).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {linkedAction && (
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                        <Sparkles className="w-3 h-3" /> Cupón: {linkedAction.name}
                        {linkedAction.allowMultipleClaims && <span className="text-gray-600">(múltiples entradas)</span>}
                      </div>
                    )}
                    {r.earlyBirdCutoff && (
                      <div className="flex items-center gap-1.5 text-yellow-500/70 text-xs mt-0.5">
                        <Trophy className="w-3 h-3" /> Early bird hasta: {new Date(r.earlyBirdCutoff).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {r.winnerName && (
                      <div className="flex items-center gap-1.5 text-green-400 text-xs mt-1">
                        <Trophy className="w-3 h-3" />
                        Ganador: <span className="font-bold">{r.winnerName}</span>
                        {r.winnerInstagram && <span className="text-gray-500">(@{r.winnerInstagram})</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-col sm:flex-row">
                    {r.bonusActionId && r.status !== "completed" && (
                      <Button variant="primary" size="sm" onClick={() => openDraw(r)} className="bg-purple-600 hover:bg-purple-500">
                        <Shuffle className="w-4 h-4" /> Sortear
                      </Button>
                    )}
                    <button onClick={() => startEdit(r)} className="text-gray-600 hover:text-blue-400" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRaffle(r.id)} className="text-gray-600 hover:text-red-400" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Draw modal */}
      {drawRaffle && (
        <>
          <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={() => { setDrawRaffle(null); setSelectedWinner(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-lg w-full p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-white font-black text-xl">Realizar sorteo</h2>
                  <p className="text-gray-500 text-sm">{drawRaffle.title} — {drawRaffle.prize}</p>
                </div>
                <button onClick={() => { setDrawRaffle(null); setSelectedWinner(null); }} className="text-gray-600 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingParticipants ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-purple-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">{participants.length} participantes</p>
                      <p className="text-gray-500 text-xs">{participants.reduce((s, p) => s + p.entries, 0)} entradas totales</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={pickRandom} className="ml-auto bg-purple-600 hover:bg-purple-500">
                      <Shuffle className="w-4 h-4" /> Elegir al azar
                    </Button>
                  </div>

                  {selectedWinner && (
                    <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-black text-lg">{selectedWinner.user.firstName} {selectedWinner.user.lastName}</p>
                      <p className="text-gray-500 text-sm">{selectedWinner.user.email}</p>
                      {selectedWinner.user.instagram && <p className="text-gray-400 text-sm">@{selectedWinner.user.instagram}</p>}
                      <p className="text-green-400 text-xs mt-1">{selectedWinner.entries} {selectedWinner.entries === 1 ? "entrada" : "entradas"}</p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                    {participants.map((p) => (
                      <div
                        key={p.user.id}
                        onClick={() => setSelectedWinner(p)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedWinner?.user.id === p.user.id ? "bg-green-500/10 border border-green-500/30" : "bg-[#1a1a1a] hover:bg-[#222]"}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                          {p.user.firstName[0]}{p.user.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">{p.user.firstName} {p.user.lastName}</p>
                          <p className="text-gray-600 text-xs truncate">{p.user.email}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-purple-400 font-bold text-sm">{p.entries}</span>
                          <span className="text-gray-600 text-xs">{p.entries === 1 ? "entrada" : "entradas"}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedWinner && (
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedWinner(null)} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:bg-[#1a1a1a] hover:text-white transition-all">
                        Volver a elegir
                      </button>
                      <Button variant="primary" size="sm" loading={savingWinner} onClick={confirmWinner} className="flex-1 bg-green-600 hover:bg-green-500">
                        <Trophy className="w-4 h-4" /> Confirmar ganador
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
