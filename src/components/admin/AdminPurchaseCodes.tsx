"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Copy, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CODE_TYPES, codeTypeLabel, type CodeType } from "@/lib/purchase-code";

interface PurchaseCodeRow {
  id: string;
  code: string;
  type: string;
  points: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const POINTS_PER_PESO = 150; // $150 = 1 punto

const TYPE_TABS: { key: CodeType; label: string; hint: string; placeholder: string; notesPlaceholder: string }[] = [
  {
    key: CODE_TYPES.story,
    label: "Historias",
    hint: "Creá el código y subilo a historias de Instagram/redes. Los participantes lo copian y lo cargan acá (TGS-HIST-...).",
    placeholder: "TGS-HIST-... (opcional)",
    notesPlaceholder: "Historia del 21/05, sorteo, etc.",
  },
  {
    key: CODE_TYPES.venue,
    label: "Ver partido en local",
    hint: "Códigos exclusivos para entregar en el local el día del partido (TGS-VIVO-...).",
    placeholder: "TGS-VIVO-... (opcional)",
    notesPlaceholder: "Partido / fecha (ej. ARG vs MEX)",
  },
  {
    key: CODE_TYPES.purchase,
    label: "Compra",
    hint: `Ingresá el monto de la compra. El sistema calcula los puntos automáticamente: cada $${POINTS_PER_PESO} = 1 punto.`,
    placeholder: "TGS-... (opcional)",
    notesPlaceholder: "Nro. de ticket, cliente, etc.",
  },
];

export function AdminPurchaseCodes() {
  const [activeType, setActiveType] = useState<CodeType>(CODE_TYPES.story);
  const [codes, setCodes] = useState<PurchaseCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ code: "", points: "30", amount: "", notes: "" });

  const tabMeta = TYPE_TABS.find((t) => t.key === activeType)!;

  const load = async (type: CodeType) => {
    const res = await fetch(`/api/admin/purchase-codes?type=${type}`);
    if (res.ok) {
      const data = await res.json();
      setCodes(data.purchaseCodes || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load(activeType);
  }, [activeType]);

  const isPurchaseTab = activeType === CODE_TYPES.purchase;
  const purchaseAmount = parseFloat(form.amount);
  const calculatedPoints = isPurchaseTab
    ? Math.floor(purchaseAmount / POINTS_PER_PESO)
    : parseInt(form.points, 10);

  const createCode = async () => {
    const points = calculatedPoints;
    if (isPurchaseTab) {
      if (!form.amount || isNaN(purchaseAmount) || purchaseAmount <= 0) {
        toast.error("Ingresá el monto de la compra");
        return;
      }
      if (points < 1) {
        toast.error(`El monto mínimo es $${POINTS_PER_PESO} para obtener al menos 1 punto`);
        return;
      }
    } else if (!points || points < 1) {
      toast.error("Ingresá los puntos del código");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/purchase-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          code: form.code.trim() || undefined,
          points,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear código");
        return;
      }
      setCodes((prev) => [data.purchaseCode, ...prev]);
      setForm({ code: "", points: form.points, amount: "", notes: "" });
      toast.success(
        activeType === CODE_TYPES.story
          ? `Código ${data.purchaseCode.code} listo — subilo a historias`
          : `Código ${data.purchaseCode.code} creado`
      );
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    setUpdating((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/purchase-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar");
        return;
      }
      await load(activeType);
      toast.success(status === "approved" ? "Puntos acreditados" : "Código rechazado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating((p) => ({ ...p, [id]: false }));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este código?")) return;
    const res = await fetch(`/api/admin/purchase-codes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar");
      return;
    }
    setCodes((prev) => prev.filter((c) => c.id !== id));
    toast.success("Código eliminado");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  if (loading) {
    return <p className="text-gray-500 text-sm">Cargando códigos...</p>;
  }

  const pending = codes.filter((c) => c.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveType(tab.key)}
            className={`flex-1 min-w-[8rem] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeType === tab.key
                ? "bg-red-600 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">
          Nuevo código — {tabMeta.label}
        </h3>
        <p className="text-gray-600 text-xs mb-4">{tabMeta.hint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Input
            placeholder={tabMeta.placeholder}
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            className="font-mono sm:col-span-1"
          />
          {isPurchaseTab ? (
            <div className="flex flex-col gap-1">
              <Input
                type="number"
                placeholder="Monto de compra ($)"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
              {form.amount && !isNaN(purchaseAmount) && purchaseAmount > 0 && (
                <p className="text-yellow-400 text-xs font-bold px-1">
                  = {calculatedPoints} punto{calculatedPoints !== 1 ? "s" : ""}
                  {calculatedPoints < 1 && <span className="text-red-400 ml-1">(mínimo $150)</span>}
                </p>
              )}
            </div>
          ) : (
            <Input
              type="number"
              placeholder="Puntos"
              value={form.points}
              onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))}
            />
          )}
          <Input
            placeholder={tabMeta.notesPlaceholder}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="sm:col-span-3"
          />
        </div>
        <Button variant="primary" size="sm" loading={creating} onClick={createCode}>
          <Plus className="w-4 h-4" /> Generar código
        </Button>
      </Card>

      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2">
            Pendientes ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((c) => (
              <Card key={c.id} className="p-4 border-yellow-600/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-white font-bold">{c.code}</span>
                      <Badge variant="info" className="text-[10px]">
                        {codeTypeLabel(c.type)}
                      </Badge>
                      <Badge variant="success">+{c.points} pts</Badge>
                    </div>
                    {c.user && (
                      <p className="text-gray-400 text-sm mt-1">
                        {c.user.firstName} {c.user.lastName} · {c.user.email}
                      </p>
                    )}
                    {c.notes && <p className="text-gray-600 text-xs mt-1">{c.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={updating[c.id]}
                      onClick={() => review(c.id, "approved")}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Acreditar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={updating[c.id]}
                      onClick={() => review(c.id, "rejected")}
                    >
                      <XCircle className="w-3 h-3" /> Rechazar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
          Todos — {tabMeta.label}
        </h3>
        {codes.length === 0 && (
          <Card className="p-6 text-center text-gray-500 text-sm">No hay códigos de este tipo</Card>
        )}
        {codes.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="font-mono text-white text-sm">{c.code}</span>
                <button
                  type="button"
                  onClick={() => copyCode(c.code)}
                  className="text-gray-600 hover:text-white"
                  title="Copiar"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <Badge variant="success" className="text-[10px]">
                  +{c.points}
                </Badge>
                <Badge
                  variant={
                    c.status === "redeemed"
                      ? "success"
                      : c.status === "pending"
                        ? "warning"
                        : c.status === "rejected"
                          ? "error"
                          : "default"
                  }
                >
                  {c.status === "available"
                    ? "disponible"
                    : c.status === "pending"
                      ? "pendiente"
                      : c.status === "redeemed"
                        ? "canjeado"
                        : c.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {c.user && c.status !== "available" && (
                  <span className="text-gray-600 text-xs truncate max-w-[12rem]">
                    {c.user.email}
                  </span>
                )}
                {c.status === "available" && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {c.notes && <p className="text-gray-600 text-xs mt-2">{c.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
