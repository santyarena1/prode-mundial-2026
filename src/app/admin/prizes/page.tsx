"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  requiredPoints: number;
  stock: number;
  active: boolean;
}

interface Redemption {
  id: string;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  prize: { name: string; requiredPoints: number };
}

export default function AdminPrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prizes" | "redemptions">("prizes");
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    imageUrl: "",
    requiredPoints: "",
    stock: "",
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      const [pRes, rRes] = await Promise.all([
        fetch("/api/admin/prizes"),
        fetch("/api/admin/redemptions"),
      ]);
      if (pRes.ok) setPrizes((await pRes.json()).prizes || []);
      if (rRes.ok) setRedemptions((await rRes.json()).redemptions || []);
      setLoading(false);
    };
    init();
  }, []);

  const createPrize = async () => {
    if (!newPrize.name || !newPrize.description || !newPrize.requiredPoints) {
      toast.error("Nombre, descripción y puntos son requeridos");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPrize.name,
          description: newPrize.description,
          imageUrl: newPrize.imageUrl || undefined,
          requiredPoints: parseInt(newPrize.requiredPoints),
          stock: parseInt(newPrize.stock) || 0,
          active: true,
        }),
      });
      if (!res.ok) { toast.error("Error al crear premio"); return; }
      const data = await res.json();
      setPrizes((prev) => [...prev, data.prize]);
      setNewPrize({ name: "", description: "", imageUrl: "", requiredPoints: "", stock: "" });
      toast.success("Premio creado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const deletePrize = async (id: string) => {
    if (!confirm("¿Eliminar este premio?")) return;
    const res = await fetch(`/api/admin/prizes/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setPrizes((prev) => prev.filter((p) => p.id !== id));
    toast.success("Premio eliminado");
  };

  const updateRedemption = async (id: string, status: "approved" | "rejected") => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/redemptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      setRedemptions((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(status === "approved" ? "Canje aprobado" : "Canje rechazado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Premios</h1>
          <p className="text-gray-500 text-sm">{prizes.length} premios · {pending.length} canjes pendientes</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6 max-w-xs">
        {(["prizes", "redemptions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "prizes" ? "Premios" : `Canjes ${pending.length > 0 ? `(${pending.length})` : ""}`}
          </button>
        ))}
      </div>

      {activeTab === "prizes" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nuevo premio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Input placeholder="Nombre" value={newPrize.name} onChange={(e) => setNewPrize((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="URL imagen" value={newPrize.imageUrl} onChange={(e) => setNewPrize((p) => ({ ...p, imageUrl: e.target.value }))} />
              <Input placeholder="Descripción" value={newPrize.description} onChange={(e) => setNewPrize((p) => ({ ...p, description: e.target.value }))} className="sm:col-span-2" />
              <Input type="number" placeholder="Puntos requeridos" value={newPrize.requiredPoints} onChange={(e) => setNewPrize((p) => ({ ...p, requiredPoints: e.target.value }))} />
              <Input type="number" placeholder="Stock disponible" value={newPrize.stock} onChange={(e) => setNewPrize((p) => ({ ...p, stock: e.target.value }))} />
            </div>
            <Button variant="primary" size="sm" loading={creating} onClick={createPrize}>
              <Plus className="w-4 h-4" /> Crear premio
            </Button>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-bold text-sm">{p.name}</h3>
                  <button onClick={() => deletePrize(p.id)} className="text-gray-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-500 text-xs mb-3 line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-bold text-sm">{p.requiredPoints} pts</span>
                  <Badge variant={p.active ? "success" : "default"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="text-gray-600 text-xs mt-1">Stock: {p.stock}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "redemptions" && (
        <div className="space-y-3">
          {redemptions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No hay canjes registrados</p>
            </Card>
          )}
          {redemptions.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{r.user.firstName} {r.user.lastName}</div>
                  <div className="text-gray-500 text-xs">{r.user.email}</div>
                  <div className="text-gray-400 text-sm mt-1">
                    Premio: <span className="font-semibold">{r.prize.name}</span>
                    <span className="text-gray-600 ml-2">({r.prize.requiredPoints} pts)</span>
                  </div>
                  <div className="text-gray-700 text-xs mt-0.5">
                    {new Date(r.createdAt).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "error" : "warning"}>
                    {r.status}
                  </Badge>
                  {r.status === "pending" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={updating[r.id]}
                        onClick={() => updateRedemption(r.id, "approved")}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Aprobar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={updating[r.id]}
                        onClick={() => updateRedemption(r.id, "rejected")}
                      >
                        <XCircle className="w-3 h-3" /> Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
