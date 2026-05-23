"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, Save, X, Trophy, Clock, CheckCircle2, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface WeeklyRaffle {
  id: string;
  title: string;
  description?: string | null;
  prize: string;
  scheduledAt: string;
  status: string;
  winnerName?: string | null;
  winnerInstagram?: string | null;
  imageUrl?: string | null;
}

const STATUSES = [
  { value: "upcoming", label: "Próximo", variant: "info" as const },
  { value: "live", label: "En vivo", variant: "warning" as const },
  { value: "completed", label: "Realizado", variant: "success" as const },
  { value: "cancelled", label: "Cancelado", variant: "error" as const },
];

const emptyForm = {
  title: "",
  description: "",
  prize: "",
  scheduledAt: "",
  status: "upcoming",
  winnerName: "",
  winnerInstagram: "",
};

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<WeeklyRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/raffles")
      .then((r) => r.json())
      .then((d) => setRaffles(d.raffles || []))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Create form */}
      {showCreate && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nuevo sorteo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              label="Título"
              placeholder="Ej: Sorteo Semana 1"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <Input
              label="Premio"
              placeholder="Ej: Auriculares gaming"
              value={form.prize}
              onChange={(e) => setForm((p) => ({ ...p, prize: e.target.value }))}
            />
            <Input
              label="Fecha y hora del sorteo"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Descripción (opcional) — ej: quiénes participan, condiciones"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="sm:col-span-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
            />
            <Input
              label="Nombre del ganador (dejar vacío si no hay)"
              placeholder="Nombre completo"
              value={form.winnerName}
              onChange={(e) => setForm((p) => ({ ...p, winnerName: e.target.value }))}
            />
            <Input
              label="Instagram del ganador (sin @)"
              placeholder="usuario_instagram"
              value={form.winnerInstagram}
              onChange={(e) => setForm((p) => ({ ...p, winnerInstagram: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" loading={creating} onClick={createRaffle}>
              <Plus className="w-4 h-4" /> Crear sorteo
            </Button>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white px-3">
              Cancelar
            </button>
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
        {raffles.map((r) => (
          <Card key={r.id} className="p-5">
            {editingId === r.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Título" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                  <Input label="Premio" value={editForm.prize} onChange={(e) => setEditForm((p) => ({ ...p, prize: e.target.value }))} />
                  <Input label="Fecha y hora" type="datetime-local" value={editForm.scheduledAt} onChange={(e) => setEditForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                      className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <textarea
                    placeholder="Descripción (opcional)"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="sm:col-span-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
                  />
                  <Input label="Nombre del ganador" placeholder="Dejar vacío si no hay" value={editForm.winnerName} onChange={(e) => setEditForm((p) => ({ ...p, winnerName: e.target.value }))} />
                  <Input label="Instagram del ganador (sin @)" placeholder="usuario_instagram" value={editForm.winnerInstagram} onChange={(e) => setEditForm((p) => ({ ...p, winnerInstagram: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" loading={saving[r.id]} onClick={saveEdit}>
                    <Save className="w-4 h-4" /> Guardar
                  </Button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-white font-bold">{r.title}</h3>
                    <Badge variant={statusInfo(r.status).variant}>{statusInfo(r.status).label}</Badge>
                  </div>
                  <p className="text-red-400 text-sm font-semibold mb-1">Premio: {r.prize}</p>
                  {r.description && <p className="text-gray-500 text-xs mb-1">{r.description}</p>}
                  <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                    <Clock className="w-3 h-3" />
                    {new Date(r.scheduledAt).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {r.winnerName && (
                    <div className="flex items-center gap-1.5 text-green-400 text-xs mt-1">
                      <Trophy className="w-3 h-3" />
                      Ganador: <span className="font-bold">{r.winnerName}</span>
                      {r.winnerInstagram && <span className="text-gray-500">(@{r.winnerInstagram})</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
        ))}
      </div>
    </div>
  );
}
