"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle2, XCircle, Pencil, Save, X as XIcon, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { AdminPurchaseCodes } from "@/components/admin/AdminPurchaseCodes";

const HANDLE_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "X / Twitter" },
  { key: "facebook", label: "Facebook" },
  { key: "twitch", label: "Twitch" },
];

interface BonusAction {
  id: string;
  name: string;
  description: string;
  points: number;
  requiresEvidence: boolean;
  actionUrl?: string | null;
  requiredHandles?: string | null;
  active: boolean;
}

interface UserBonus {
  id: string;
  status: string;
  evidenceUrl?: string | null;
  socialHandles?: string | null;
  createdAt: string;
  pointsEarned: number;
  user: { firstName: string; lastName: string; email: string; instagram?: string | null };
  bonusAction: { name: string; points: number };
}

const emptyEdit = { name: "", description: "", points: "", actionUrl: "", requiredHandles: [] as string[], active: true };

export default function AdminBonusPage() {
  const [actions, setActions] = useState<BonusAction[]>([]);
  const [userBonuses, setUserBonuses] = useState<UserBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"actions" | "claims" | "codes">("codes");
  const [newAction, setNewAction] = useState({
    name: "", description: "", points: "", actionUrl: "", requiresEvidence: false, requiredHandles: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [claimsFilter, setClaimsFilter] = useState<"all" | "approved" | "rejected">("all");

  useEffect(() => {
    const init = async () => {
      const [aRes, ubRes] = await Promise.all([
        fetch("/api/admin/bonus-actions"),
        fetch("/api/admin/user-bonuses"),
      ]);
      if (aRes.ok) setActions((await aRes.json()).bonusActions || []);
      if (ubRes.ok) setUserBonuses((await ubRes.json()).userBonuses || []);
      setLoading(false);
    };
    init();
  }, []);

  const toggleHandle = (platform: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(platform) ? list.filter((p) => p !== platform) : [...list, platform]);
  };

  const createAction = async () => {
    if (!newAction.name || !newAction.description || !newAction.points) {
      toast.error("Nombre, descripción y puntos son requeridos");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/bonus-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAction.name,
          description: newAction.description,
          points: parseInt(newAction.points),
          requiresEvidence: newAction.requiresEvidence,
          actionUrl: newAction.actionUrl.trim() || undefined,
          requiredHandles: newAction.requiredHandles.length > 0 ? JSON.stringify(newAction.requiredHandles) : undefined,
          active: true,
        }),
      });
      if (!res.ok) { toast.error("Error al crear acción bonus"); return; }
      const data = await res.json();
      setActions((prev) => [...prev, data.bonusAction]);
      setNewAction({ name: "", description: "", points: "", actionUrl: "", requiresEvidence: false, requiredHandles: [] });
      toast.success("Acción bonus creada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const deleteAction = async (id: string) => {
    if (!confirm("¿Eliminar esta acción?")) return;
    const res = await fetch(`/api/admin/bonus-actions/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setActions((prev) => prev.filter((a) => a.id !== id));
    toast.success("Acción eliminada");
  };

  const startEdit = (a: BonusAction) => {
    setEditingId(a.id);
    let handles: string[] = [];
    try { handles = a.requiredHandles ? JSON.parse(a.requiredHandles) : []; } catch { handles = []; }
    setEditForm({ name: a.name, description: a.description, points: String(a.points), actionUrl: a.actionUrl || "", requiredHandles: handles, active: a.active });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setUpdating((p) => ({ ...p, [editingId]: true }));
    try {
      const res = await fetch(`/api/admin/bonus-actions/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          points: parseInt(editForm.points),
          actionUrl: editForm.actionUrl.trim() || null,
          requiredHandles: editForm.requiredHandles.length > 0 ? JSON.stringify(editForm.requiredHandles) : null,
          active: editForm.active,
        }),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      const data = await res.json();
      setActions((prev) => prev.map((a) => a.id === editingId ? { ...a, ...data.bonusAction } : a));
      setEditingId(null);
      toast.success("Acción actualizada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating((p) => ({ ...p, [editingId!]: false }));
    }
  };

  const updateBonus = async (id: string, status: "approved" | "rejected") => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/user-bonuses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      setUserBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast.success(status === "approved" ? "Bonus aprobado" : "Bonus rechazado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  const filteredBonuses = claimsFilter === "all"
    ? userBonuses
    : userBonuses.filter((b) => b.status === claimsFilter);

  const HandlesCheckboxes = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <div>
      <p className="text-gray-500 text-xs mb-2">Redes sociales a verificar (el usuario deberá ingresar su usuario en cada una seleccionada):</p>
      <div className="flex flex-wrap gap-2">
        {HANDLE_PLATFORMS.map((p) => (
          <label key={p.key} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(p.key)}
              onChange={() => toggleHandle(p.key, value, onChange)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">{p.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Bonus</h1>
        <p className="text-gray-500 text-sm">{actions.length} acciones · {userBonuses.length} reclamos totales</p>
      </div>

      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6 max-w-lg flex-wrap">
        {[
          { key: "codes" as const, label: "Códigos compra" },
          { key: "claims" as const, label: `Reclamos (${userBonuses.length})` },
          { key: "actions" as const, label: "Acciones" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[7rem] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.key ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "codes" && <AdminPurchaseCodes />}

      {activeTab === "actions" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nueva acción bonus</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Input placeholder="Nombre" value={newAction.name} onChange={(e) => setNewAction((p) => ({ ...p, name: e.target.value }))} />
              <Input type="number" placeholder="Puntos" value={newAction.points} onChange={(e) => setNewAction((p) => ({ ...p, points: e.target.value }))} />
              <textarea
                placeholder="Descripción — qué tiene que hacer el usuario exactamente"
                value={newAction.description}
                onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="sm:col-span-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
              />
              <Input placeholder="URL de la acción (opcional, para redirigir al usuario)" value={newAction.actionUrl} onChange={(e) => setNewAction((p) => ({ ...p, actionUrl: e.target.value }))} className="sm:col-span-2" />
            </div>
            <div className="mb-3">
              <HandlesCheckboxes value={newAction.requiredHandles} onChange={(v) => setNewAction((p) => ({ ...p, requiredHandles: v }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-3 cursor-pointer">
              <input type="checkbox" checked={newAction.requiresEvidence} onChange={(e) => setNewAction((p) => ({ ...p, requiresEvidence: e.target.checked }))} className="rounded" />
              Requiere URL de evidencia adicional
            </label>
            <Button variant="primary" size="sm" loading={creating} onClick={createAction}>
              <Plus className="w-4 h-4" /> Crear acción
            </Button>
          </Card>

          <div className="space-y-3">
            {actions.map((a) => {
              let handles: string[] = [];
              try { handles = a.requiredHandles ? JSON.parse(a.requiredHandles) : []; } catch { handles = []; }
              return (
                <Card key={a.id} className="p-4">
                  {editingId === a.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input placeholder="Nombre" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                        <Input type="number" placeholder="Puntos" value={editForm.points} onChange={(e) => setEditForm((p) => ({ ...p, points: e.target.value }))} />
                        <textarea
                          placeholder="Descripción — qué tiene que hacer el usuario"
                          value={editForm.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          rows={3}
                          className="sm:col-span-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none"
                        />
                        <Input placeholder="URL de la acción (para redirigir al usuario)" value={editForm.actionUrl} onChange={(e) => setEditForm((p) => ({ ...p, actionUrl: e.target.value }))} className="sm:col-span-2" />
                      </div>
                      <HandlesCheckboxes value={editForm.requiredHandles} onChange={(v) => setEditForm((p) => ({ ...p, requiredHandles: v }))} />
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.checked }))} />
                        Activo (visible para usuarios)
                      </label>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" loading={updating[a.id]} onClick={saveEdit}>
                          <Save className="w-4 h-4" /> Guardar
                        </Button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-bold text-sm">{a.name}</h3>
                          <Badge variant="success" className="text-xs">+{a.points} pts</Badge>
                          {a.requiresEvidence && <Badge variant="info">Requiere evidencia</Badge>}
                          <Badge variant={a.active ? "success" : "default"}>{a.active ? "Activo" : "Inactivo"}</Badge>
                        </div>
                        <p className="text-gray-500 text-xs">{a.description}</p>
                        {handles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {handles.map((h) => (
                              <span key={h} className="text-[10px] bg-[#1a1a1a] border border-[#333] text-gray-400 px-1.5 py-0.5 rounded">
                                {HANDLE_PLATFORMS.find((p) => p.key === h)?.label ?? h}
                              </span>
                            ))}
                          </div>
                        )}
                        {a.actionUrl ? (
                          <a href={a.actionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline mt-0.5 inline-flex items-center gap-1 truncate max-w-full">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />{a.actionUrl}
                          </a>
                        ) : (
                          <span className="text-gray-700 text-xs mt-0.5 inline-block">Sin URL de redirección</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => startEdit(a)} className="text-gray-600 hover:text-blue-400" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteAction(a.id)} className="text-gray-600 hover:text-red-400" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "claims" && (
        <div>
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "all" as const, label: `Todos (${userBonuses.length})` },
              { key: "approved" as const, label: `Aprobados (${userBonuses.filter(b => b.status === "approved").length})` },
              { key: "rejected" as const, label: `Rechazados (${userBonuses.filter(b => b.status === "rejected").length})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setClaimsFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${claimsFilter === f.key ? "bg-red-600 text-white" : "bg-[#111] border border-[#222] text-gray-500 hover:text-gray-300"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBonuses.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No hay reclamos</p>
              </Card>
            )}
            {filteredBonuses.map((b) => {
              let handles: Record<string, string> = {};
              try { handles = b.socialHandles ? JSON.parse(b.socialHandles) : {}; } catch { handles = {}; }
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-white font-semibold">{b.user.firstName} {b.user.lastName}</span>
                        <Badge variant={b.status === "approved" ? "success" : b.status === "rejected" ? "error" : "warning"}>
                          {b.status === "approved" ? "Aprobado" : b.status === "rejected" ? "Rechazado" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-xs">{b.user.email}</p>
                      <p className="text-gray-300 text-sm mt-1">
                        <span className="text-gray-500">Bonus:</span> {b.bonusAction.name}
                        <span className="text-green-400 font-bold ml-2">+{b.pointsEarned} pts</span>
                      </p>

                      {/* Social handles collected */}
                      {Object.keys(handles).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(handles).map(([platform, handle]) => (
                            <div key={platform} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1">
                              <span className="text-gray-500 text-[10px] uppercase">{HANDLE_PLATFORMS.find(p => p.key === platform)?.label ?? platform}:</span>
                              <span className="text-white text-xs font-mono">{handle}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {b.user.instagram && (
                        <p className="text-gray-600 text-xs mt-1">Instagram perfil: @{b.user.instagram}</p>
                      )}
                      {b.evidenceUrl && (
                        <a href={b.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline inline-flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3" /> Ver evidencia
                        </a>
                      )}
                      <p className="text-gray-700 text-xs mt-1">{new Date(b.createdAt).toLocaleString("es-AR")}</p>
                    </div>
                    {b.status === "approved" && (
                      <Button variant="danger" size="sm" loading={updating[b.id]} onClick={() => updateBonus(b.id, "rejected")} className="flex-shrink-0">
                        <XCircle className="w-3 h-3" /> Rechazar
                      </Button>
                    )}
                    {b.status === "rejected" && (
                      <Button variant="primary" size="sm" loading={updating[b.id]} onClick={() => updateBonus(b.id, "approved")} className="flex-shrink-0 bg-green-600 hover:bg-green-500">
                        <CheckCircle2 className="w-3 h-3" /> Aprobar
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
