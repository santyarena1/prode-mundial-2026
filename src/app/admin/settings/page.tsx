"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings, Save } from "lucide-react";
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
    </div>
  );
}
