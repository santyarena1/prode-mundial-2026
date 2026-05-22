"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings, Save, RefreshCw, Trophy, Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface EventSettings {
  eventName?: string;
  active?: boolean;
  whatsappNumber?: string;
  whatsappPurchaseMessage?: string;
  whatsappVenueMessage?: string;
  instagramUrl?: string;
}

interface PointRule {
  id: string;
  key: string;
  label: string;
  points: number;
  active: boolean;
}

export default function AdminSettingsPage() {
  const [eventSettings, setEventSettings] = useState<EventSettings>({});
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [applyingRules, setApplyingRules] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [settingsRes, rulesRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/settings/point-rules"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        // settings is an array of {key, value} pairs
        const settingsArr = data.settings || [];
        const get = (key: string) =>
          settingsArr.find((s: { key: string; value: string }) => s.key === key)?.value;
        setEventSettings({
          eventName: get("event_name") || get("eventName") || "",
          active: get("event_active") !== "false" && get("active") !== "false",
          whatsappNumber: get("whatsapp_number") || "",
          whatsappPurchaseMessage: get("whatsapp_purchase_message") || "",
          whatsappVenueMessage: get("whatsapp_venue_message") || "",
          instagramUrl: get("instagram_url") || "",
        });
      }
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setPointRules(data.pointRules || []);
      }
      setLoading(false);
    };
    init();
  }, []);

  const saveEventSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "event_name", value: eventSettings.eventName || "" }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "event_active", value: String(eventSettings.active ?? true) }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "whatsapp_number", value: eventSettings.whatsappNumber || "" }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "whatsapp_purchase_message",
            value: eventSettings.whatsappPurchaseMessage || "",
          }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "whatsapp_venue_message",
            value: eventSettings.whatsappVenueMessage || "",
          }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "instagram_url", value: eventSettings.instagramUrl || "" }),
        }),
      ]);
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const savePointRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch("/api/admin/settings/point-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: pointRules }),
      });
      if (!res.ok) { toast.error("Error al guardar reglas"); return; }
      toast.success("Reglas de puntos actualizadas");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingRules(false);
    }
  };

  const updateRule = (id: string, points: number) => {
    setPointRules((prev) => prev.map((r) => (r.id === id ? { ...r, points } : r)));
  };

  const applyNewRules = async () => {
    setApplyingRules(true);
    try {
      const res = await fetch("/api/admin/achievements", { method: "POST" });
      if (!res.ok) { toast.error("Error al aplicar reglas"); return; }
      const data = await res.json();
      toast.success(`Reglas aplicadas: ${data.pointRules} puntos, ${data.achievements} logros`);
      const rulesRes = await fetch("/api/admin/settings/point-rules");
      if (rulesRes.ok) setPointRules((await rulesRes.json()).pointRules || []);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setApplyingRules(false);
    }
  };

  const seedDefaults = async () => {
    setSeedingDefaults(true);
    try {
      const res = await fetch("/api/admin/seed-defaults", { method: "POST" });
      if (!res.ok) { toast.error("Error al seedear defaults"); return; }
      const data = await res.json();
      toast.success(data.message || "Defaults aplicados");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSeedingDefaults(false);
    }
  };

  const recalculateAll = async () => {
    if (!confirm("¿Recalcular puntos de TODOS los usuarios? Puede tardar varios segundos.")) return;
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/ranking", { method: "POST" });
      if (!res.ok) { toast.error("Error al recalcular"); return; }
      const data = await res.json();
      toast.success(`Recalculado: ${data.processed}/${data.total} usuarios${data.errors > 0 ? ` (${data.errors} errores)` : ""}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Configuración</h1>
        <p className="text-gray-500 text-sm">Ajustes del evento y reglas de puntuación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event settings */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Configuración del evento
            </h3>
          </div>
          <div className="space-y-4">
            <Input
              label="Nombre del evento"
              placeholder="Prode Mundial Gamer 2026"
              value={eventSettings.eventName || ""}
              onChange={(e) => setEventSettings((p) => ({ ...p, eventName: e.target.value }))}
            />
            <Input
              label="WhatsApp The Gamer Shop"
              placeholder="5491112345678"
              value={eventSettings.whatsappNumber || ""}
              onChange={(e) =>
                setEventSettings((p) => ({ ...p, whatsappNumber: e.target.value }))
              }
            />
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
                Mensaje WhatsApp — código de compra
              </label>
              <textarea
                value={eventSettings.whatsappPurchaseMessage || ""}
                onChange={(e) =>
                  setEventSettings((p) => ({ ...p, whatsappPurchaseMessage: e.target.value }))
                }
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 resize-y"
                placeholder="Hola The Gamer Shop! Compré..."
              />
            </div>
            <Input
              label="Instagram / historias (URL)"
              placeholder="https://www.instagram.com/thegamershop/"
              value={eventSettings.instagramUrl || ""}
              onChange={(e) =>
                setEventSettings((p) => ({ ...p, instagramUrl: e.target.value }))
              }
            />
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider mb-1 block">
                Mensaje WhatsApp — consultas partido en local
              </label>
              <textarea
                value={eventSettings.whatsappVenueMessage || ""}
                onChange={(e) =>
                  setEventSettings((p) => ({ ...p, whatsappVenueMessage: e.target.value }))
                }
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 resize-y"
                placeholder="Hola! Estoy en el local viendo el partido..."
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={eventSettings.active ?? true}
                  onChange={(e) => setEventSettings((p) => ({ ...p, active: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${eventSettings.active ? "bg-red-600" : "bg-[#333]"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${eventSettings.active ? "translate-x-5 ml-0" : "translate-x-1"}`} />
                </div>
              </div>
              <span className="text-gray-300 text-sm">Evento activo (permite predicciones)</span>
            </label>
            <Button variant="primary" size="md" loading={saving} onClick={saveEventSettings} className="w-full">
              <Save className="w-4 h-4" /> Guardar configuración
            </Button>
          </div>
        </Card>

        {/* Point rules */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Reglas de puntuación
            </h3>
          </div>
          {pointRules.length === 0 ? (
            <p className="text-gray-600 text-sm">No hay reglas configuradas. Se usarán los valores por defecto.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pointRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs truncate">{rule.label}</p>
                    <p className="text-gray-600 text-xs font-mono">{rule.key}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={rule.points}
                    onChange={(e) => updateRule(rule.id, parseInt(e.target.value) || 0)}
                    className="w-16 bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:border-red-500"
                  />
                  <span className="text-gray-600 text-xs">pts</span>
                </div>
              ))}
            </div>
          )}
          {pointRules.length > 0 && (
            <Button variant="primary" size="sm" loading={savingRules} onClick={savePointRules} className="w-full mt-4">
              <Save className="w-4 h-4" /> Guardar reglas
            </Button>
          )}
        </Card>
      </div>
      {/* Achievements & Recalculate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Sistema de logros
            </h3>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Aplica los nuevos valores de puntos y crea los logros en la base de datos.
            Seguro ejecutarlo múltiples veces (upsert).
          </p>
          <div className="text-xs text-gray-600 space-y-1 mb-4">
            <div>• Buen arranque: 10 aciertos → 1.000 pts</div>
            <div>• Especialista de grupos: 35 → 3.000 pts</div>
            <div>• Experto mundialista: 45 → 7.500 pts</div>
            <div>• Máquina de grupos: 55 → 15.000 pts</div>
            <div>• Ojo clínico: 18 clasificados → 5.000 pts</div>
            <div>• Tabla perfecta → 20.000 pts</div>
            <div>• Bracket fuerte 70% → 10.000 pts</div>
            <div>• Bracket perfecto → 30.000 pts</div>
            <div>• Final soñada → 5.000 pts</div>
            <div>• Prode perfecto → 150.000 pts</div>
          </div>
          <Button variant="primary" size="sm" loading={applyingRules} onClick={applyNewRules} className="w-full">
            <Trophy className="w-4 h-4" /> Aplicar reglas y logros
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Recalcular puntos
            </h3>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Recalcula los puntos de TODOS los usuarios desde cero, incluyendo predicciones,
            clasificados, bracket, logros y bonus. Es idempotente: puede correrse múltiples veces.
          </p>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-xs">
              Ejecutá primero &quot;Aplicar reglas y logros&quot; para asegurarte de que los
              AchievementRules estén creados en la base de datos.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={recalculating}
            onClick={recalculateAll}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4" /> Recalcular todos los usuarios
          </Button>
        </Card>
      </div>

      {/* Seed premios y bonus */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Premios y acciones de bonus por defecto
            </h3>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Crea los premios y acciones de bonus iniciales en la base de datos.
            Solo agrega los que no existen todavía — no modifica ni borra los existentes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs text-gray-600">
            <div>
              <p className="text-gray-500 font-semibold mb-1">Premios (15):</p>
              <div className="space-y-0.5">
                <div>• Sorteo semanal → 1.000 pts</div>
                <div>• Cupón 5% OFF → 5.000 pts</div>
                <div>• Cupón 10% OFF → 8.000 pts</div>
                <div>• Envío bonificado → 12.000 pts</div>
                <div>• Sticker pack TGS → 15.000 pts</div>
                <div>• Mousepad gamer → 22.000 pts</div>
                <div>• Merch sponsor → 28.000 pts</div>
                <div>• Gift card TGS → 35.000 pts</div>
                <div>• Mouse gamer → 50.000 pts</div>
                <div>• Auricular gamer → 65.000 pts</div>
                <div>• Teclado gamer → 80.000 pts</div>
                <div>• Gift card importante → 90.000 pts</div>
                <div>• Periférico gamer sponsor → 110.000 pts</div>
                <div>• Combo gamer sponsor → 130.000 pts</div>
                <div>• Gran premio mundialero TGS → 150.000 pts</div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 font-semibold mb-1">Bonus actions (11):</p>
              <div className="space-y-0.5">
                <div>• Completar prode → 1.000 pts</div>
                <div>• Seguir Instagram → 500 pts</div>
                <div>• Seguir TikTok → 500 pts</div>
                <div>• Suscribirse YouTube → 700 pts</div>
                <div>• Compartir historia → 1.000 pts</div>
                <div>• Seguir sponsor → 700 pts</div>
                <div>• Código compra chica → 1.500 pts</div>
                <div>• Código compra media → 3.000 pts</div>
                <div>• Código compra grande → 6.000 pts</div>
                <div>• Ver partido en local → 2.500 pts</div>
                <div>• Invitar amigo validado → 1.500 pts</div>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" loading={seedingDefaults} onClick={seedDefaults} className="w-full">
            <Gift className="w-4 h-4" /> Crear premios y bonus por defecto
          </Button>
        </Card>
      </div>
    </div>
  );
}
