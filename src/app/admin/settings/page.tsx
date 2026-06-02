"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings, Save, RefreshCw, Trophy, Gift, Store, Image } from "lucide-react";
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
  referralPoints?: string;
  referralNewUserPoints?: string;
}

interface StoreConfig {
  name: string;
  address: string;
  mapsUrl: string;
  instagram: string;
  instagramUrl: string;
  phone: string;
  phoneUrl: string;
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
  const [stores, setStores] = useState<[StoreConfig, StoreConfig]>([
    { name: "", address: "", mapsUrl: "", instagram: "", instagramUrl: "", phone: "", phoneUrl: "" },
    { name: "", address: "", mapsUrl: "", instagram: "", instagramUrl: "", phone: "", phoneUrl: "" },
  ]);
  const [savingStores, setSavingStores] = useState(false);
  const [sponsorBanners, setSponsorBanners] = useState({
    dashboardImageUrl: "",
    dashboardLinkUrl: "",
    dashboardVisible: false,
    predictionsText: "",
    predictionsButtonLabel: "",
    predictionsButtonUrl: "",
    predictionsVisible: false,
  });
  const [savingBanners, setSavingBanners] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [settingsRes, rulesRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/settings/point-rules"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const settingsArr = data.settings || [];
        const get = (key: string) =>
          settingsArr.find((s: { key: string; value: string }) => s.key === key)?.value ?? "";
        setEventSettings({
          eventName: get("event_name") || get("eventName") || "",
          active: get("event_active") !== "false" && get("active") !== "false",
          whatsappNumber: get("whatsapp_number") || "",
          whatsappPurchaseMessage: get("whatsapp_purchase_message") || "",
          whatsappVenueMessage: get("whatsapp_venue_message") || "",
          instagramUrl: get("instagram_url") || "",
          referralPoints: get("referral_points") || "200",
          referralNewUserPoints: get("referral_new_user_points") || "300",
        });
        setSponsorBanners({
          dashboardImageUrl: get("sponsor_banner_dashboard_image_url"),
          dashboardLinkUrl: get("sponsor_banner_dashboard_link_url"),
          dashboardVisible: get("sponsor_banner_dashboard_visible") === "true",
          predictionsText: get("sponsor_banner_predictions_text"),
          predictionsButtonLabel: get("sponsor_banner_predictions_button_label"),
          predictionsButtonUrl: get("sponsor_banner_predictions_button_url"),
          predictionsVisible: get("sponsor_banner_predictions_visible") === "true",
        });
        setStores([
          {
            name: get("store_1_name"),
            address: get("store_1_address"),
            mapsUrl: get("store_1_maps_url"),
            instagram: get("store_1_instagram"),
            instagramUrl: get("store_1_instagram_url"),
            phone: get("store_1_phone"),
            phoneUrl: get("store_1_phone_url"),
          },
          {
            name: get("store_2_name"),
            address: get("store_2_address"),
            mapsUrl: get("store_2_maps_url"),
            instagram: get("store_2_instagram"),
            instagramUrl: get("store_2_instagram_url"),
            phone: get("store_2_phone"),
            phoneUrl: get("store_2_phone_url"),
          },
        ]);
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
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "referral_points", value: String(parseInt(eventSettings.referralPoints || "200") || 200) }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "referral_new_user_points", value: String(parseInt(eventSettings.referralNewUserPoints || "300") || 300) }),
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

  const updateStore = (idx: 0 | 1, field: keyof StoreConfig, value: string) => {
    setStores((prev) => {
      const next: [StoreConfig, StoreConfig] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const saveStores = async () => {
    setSavingStores(true);
    try {
      const pairs: [string, string][] = [];
      stores.forEach((s, i) => {
        const n = i + 1;
        pairs.push(
          [`store_${n}_name`, s.name],
          [`store_${n}_address`, s.address],
          [`store_${n}_maps_url`, s.mapsUrl],
          [`store_${n}_instagram`, s.instagram],
          [`store_${n}_instagram_url`, s.instagramUrl],
          [`store_${n}_phone`, s.phone],
          [`store_${n}_phone_url`, s.phoneUrl],
        );
      });
      await Promise.all(
        pairs.map(([key, value]) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
          })
        )
      );
      toast.success("Locales guardados");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingStores(false);
    }
  };

  const saveSponsorBanners = async () => {
    setSavingBanners(true);
    try {
      const pairs: [string, string][] = [
        ["sponsor_banner_dashboard_image_url", sponsorBanners.dashboardImageUrl],
        ["sponsor_banner_dashboard_link_url", sponsorBanners.dashboardLinkUrl],
        ["sponsor_banner_dashboard_visible", String(sponsorBanners.dashboardVisible)],
        ["sponsor_banner_predictions_text", sponsorBanners.predictionsText],
        ["sponsor_banner_predictions_button_label", sponsorBanners.predictionsButtonLabel],
        ["sponsor_banner_predictions_button_url", sponsorBanners.predictionsButtonUrl],
        ["sponsor_banner_predictions_visible", String(sponsorBanners.predictionsVisible)],
      ];
      await Promise.all(
        pairs.map(([key, value]) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
          })
        )
      );
      toast.success("Banners guardados");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingBanners(false);
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
            <Input
              type="number"
              label="Puntos para quien comparte el código (referidor)"
              placeholder="200"
              value={eventSettings.referralPoints ?? "200"}
              onChange={(e) => setEventSettings((p) => ({ ...p, referralPoints: e.target.value }))}
            />
            <Input
              type="number"
              label="Puntos para quien se registra con un código (nuevo usuario)"
              placeholder="300"
              value={eventSettings.referralNewUserPoints ?? "300"}
              onChange={(e) => setEventSettings((p) => ({ ...p, referralNewUserPoints: e.target.value }))}
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
            <div>• Buen arranque: 10 aciertos → 2.000 pts</div>
            <div>• Racha de aciertos: 25 → 6.000 pts</div>
            <div>• Especialista de grupos: 40 → 15.000 pts</div>
            <div>• Máquina de grupos: 55 → 35.000 pts</div>
            <div>• Ojo de halcón: 12 clasificados → 5.000 pts</div>
            <div>• Ojo clínico: 18 clasificados → 12.000 pts</div>
            <div>• Todos clasificados: 24 → 30.000 pts</div>
            <div>• Tabla perfecta → 50.000 pts</div>
            <div>• Bracket fuerte 70% → 20.000 pts</div>
            <div>• Bracket perfecto → 60.000 pts</div>
            <div>• Fase de grupos excelente → 35.000 pts</div>
            <div>• Fase de grupos perfecta → 80.000 pts</div>
            <div>• Prode casi perfecto → 120.000 pts</div>
            <div>• Prode perfecto → 250.000 pts</div>
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
              <p className="text-gray-500 font-semibold mb-1">Premios (16):</p>
              <div className="space-y-0.5">
                <div>• Sorteo semanal → 1.000 pts</div>
                <div>• Cupón chico → 3.000 pts</div>
                <div>• Cupón 5% OFF → 5.000 pts</div>
                <div>• Cupón 10% OFF → 10.000 pts</div>
                <div>• Sticker pack TGS → 15.000 pts</div>
                <div>• Envío bonificado → 18.000 pts</div>
                <div>• Mousepad gamer → 25.000 pts</div>
                <div>• Gift card TGS → 35.000 pts</div>
                <div>• Merch sponsor → 50.000 pts</div>
                <div>• Mouse gamer → 75.000 pts</div>
                <div>• Auricular gamer → 95.000 pts</div>
                <div>• Teclado gamer → 120.000 pts</div>
                <div>• Gift card importante → 150.000 pts</div>
                <div>• Periférico gamer sponsor → 180.000 pts</div>
                <div>• Combo gamer sponsor → 220.000 pts</div>
                <div>• Gran premio mundialero TGS → 250.000 pts</div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 font-semibold mb-1">Bonus actions (10):</p>
              <div className="space-y-0.5">
                <div>• Registrarse y completar perfil → 300 pts</div>
                <div>• Completar todo el prode → 1.500 pts</div>
                <div>• Seguir Instagram TGS → 300 pts</div>
                <div>• Seguir TikTok TGS → 300 pts</div>
                <div>• Suscribirse YouTube TGS → 400 pts</div>
                <div>• Compartir historia etiquetando TGS → 700 pts</div>
                <div>• Seguir sponsor del Prode → 400 pts</div>
                <div>• Invitar amigo validado → 1.000 pts</div>
                <div>• Ver partido en el local TGS → 1.500 pts</div>
                <div>• Código de compra → $150 = 1 pt (fórmula)</div>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" loading={seedingDefaults} onClick={seedDefaults} className="w-full">
            <Gift className="w-4 h-4" /> Crear premios y bonus por defecto
          </Button>
        </Card>
      </div>

      {/* Store settings */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Locales (modal &quot;Sumate ahora&quot;)
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {([0, 1] as const).map((idx) => (
            <Card key={idx} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-black">{idx + 1}</span>
                </div>
                <h4 className="text-sm font-bold text-white">Local {idx + 1}</h4>
              </div>
              <div className="space-y-3">
                <Input
                  label="Nombre"
                  placeholder={`Local ${idx + 1}`}
                  value={stores[idx].name}
                  onChange={(e) => updateStore(idx, "name", e.target.value)}
                />
                <Input
                  label="Dirección"
                  placeholder="Av. Corrientes 1234, CABA"
                  value={stores[idx].address}
                  onChange={(e) => updateStore(idx, "address", e.target.value)}
                />
                <Input
                  label="Link Google Maps"
                  placeholder="https://maps.google.com/..."
                  value={stores[idx].mapsUrl}
                  onChange={(e) => updateStore(idx, "mapsUrl", e.target.value)}
                />
                <Input
                  label="Instagram (texto)"
                  placeholder="@thegamershop_oficial"
                  value={stores[idx].instagram}
                  onChange={(e) => updateStore(idx, "instagram", e.target.value)}
                />
                <Input
                  label="Instagram (URL)"
                  placeholder="https://www.instagram.com/thegamershop_oficial/"
                  value={stores[idx].instagramUrl}
                  onChange={(e) => updateStore(idx, "instagramUrl", e.target.value)}
                />
                <Input
                  label="Teléfono (texto)"
                  placeholder="+54 9 11 1234-5678"
                  value={stores[idx].phone}
                  onChange={(e) => updateStore(idx, "phone", e.target.value)}
                />
                <Input
                  label="Teléfono (URL WhatsApp)"
                  placeholder="https://wa.me/5491112345678"
                  value={stores[idx].phoneUrl}
                  onChange={(e) => updateStore(idx, "phoneUrl", e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" loading={savingStores} onClick={saveStores} className="w-full sm:w-auto">
            <Save className="w-4 h-4" /> Guardar locales
          </Button>
        </div>
      </div>
      {/* Sponsor banners */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Banners de sponsor
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dashboard banner */}
          <Card className="p-5">
            <h4 className="text-sm font-bold text-white mb-4">Banner del Dashboard <span className="text-gray-600 font-normal text-xs">(1200×80px)</span></h4>
            <div className="space-y-3">
              <Input
                label="URL de la imagen"
                placeholder="https://cdn.ejemplo.com/banner.jpg"
                value={sponsorBanners.dashboardImageUrl}
                onChange={(e) => setSponsorBanners(p => ({ ...p, dashboardImageUrl: e.target.value }))}
              />
              <Input
                label="URL de destino (clic)"
                placeholder="https://thegamershop.com"
                value={sponsorBanners.dashboardLinkUrl}
                onChange={(e) => setSponsorBanners(p => ({ ...p, dashboardLinkUrl: e.target.value }))}
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={sponsorBanners.dashboardVisible}
                    onChange={(e) => setSponsorBanners(p => ({ ...p, dashboardVisible: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${sponsorBanners.dashboardVisible ? "bg-red-600" : "bg-[#333]"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${sponsorBanners.dashboardVisible ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                </div>
                <span className="text-gray-300 text-sm">Visible en el dashboard</span>
              </label>
              {sponsorBanners.dashboardImageUrl && (
                <div className="rounded-lg overflow-hidden border border-[#333] h-[60px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sponsorBanners.dashboardImageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </Card>

          {/* Predictions CTA */}
          <Card className="p-5">
            <h4 className="text-sm font-bold text-white mb-4">CTA en Mis Predicciones <span className="text-gray-600 font-normal text-xs">(texto + botón)</span></h4>
            <div className="space-y-3">
              <Input
                label="Texto"
                placeholder="Visitá The Gamer Shop y encontrá los mejores periféricos"
                value={sponsorBanners.predictionsText}
                onChange={(e) => setSponsorBanners(p => ({ ...p, predictionsText: e.target.value }))}
              />
              <Input
                label="Label del botón"
                placeholder="Ver tienda"
                value={sponsorBanners.predictionsButtonLabel}
                onChange={(e) => setSponsorBanners(p => ({ ...p, predictionsButtonLabel: e.target.value }))}
              />
              <Input
                label="URL del botón"
                placeholder="https://thegamershop.com"
                value={sponsorBanners.predictionsButtonUrl}
                onChange={(e) => setSponsorBanners(p => ({ ...p, predictionsButtonUrl: e.target.value }))}
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={sponsorBanners.predictionsVisible}
                    onChange={(e) => setSponsorBanners(p => ({ ...p, predictionsVisible: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${sponsorBanners.predictionsVisible ? "bg-red-600" : "bg-[#333]"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${sponsorBanners.predictionsVisible ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                </div>
                <span className="text-gray-300 text-sm">Visible en Mis Predicciones</span>
              </label>
              {(sponsorBanners.predictionsText || sponsorBanners.predictionsButtonLabel) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                  <span className="text-gray-400 text-xs truncate">{sponsorBanners.predictionsText}</span>
                  {sponsorBanners.predictionsButtonLabel && (
                    <span className="flex-shrink-0 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">
                      {sponsorBanners.predictionsButtonLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" loading={savingBanners} onClick={saveSponsorBanners} className="w-full sm:w-auto">
            <Save className="w-4 h-4" /> Guardar banners
          </Button>
        </div>
      </div>
    </div>
  );
}
