"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface SyncLog {
  id: string;
  type: string;
  status: string;
  message: string;
  itemsProcessed?: number;
  createdAt: string;
}

interface Settings {
  apiProvider?: string;
  apiKey?: string;
  apiBaseUrl?: string;
}

export default function AdminSyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [logsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/sync/logs"),
        fetch("/api/admin/settings"),
      ]);
      if (logsRes.ok) setLogs((await logsRes.json()).logs || []);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const arr: {key: string; value: string}[] = data.settings || [];
        const obj: Settings = {};
        for (const s of arr) { (obj as Record<string, string>)[s.key] = s.value; }
        setSettings(obj);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSync = async (type: "fixtures" | "results") => {
    setSyncing((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/admin/sync/${type}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al sincronizar"); return; }
      toast.success(`Sincronización de ${type} completada`);
      const logsRes = await fetch("/api/admin/sync/logs");
      if (logsRes.ok) setLogs((await logsRes.json()).logs || []);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      // Save each setting key-value
      for (const [key, value] of Object.entries(settings)) {
        if (value === undefined || value === "") continue;
        await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
      }
      const res = { ok: true };
      if (!res.ok) { toast.error("Error al guardar configuración"); return; }
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const recentLogs = logs.slice(0, 50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Sincronización</h1>
        <p className="text-gray-500 text-sm">Configuración del proveedor de datos y sincronización</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Provider settings */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Configuración del proveedor
            </h3>
          </div>
          <div className="space-y-3">
            <Input
              label="Proveedor API"
              placeholder="ej: api-football"
              value={settings.apiProvider || ""}
              onChange={(e) => setSettings((p) => ({ ...p, apiProvider: e.target.value }))}
            />
            <Input
              label="API Key"
              type="password"
              placeholder="Tu API key"
              value={settings.apiKey || ""}
              onChange={(e) => setSettings((p) => ({ ...p, apiKey: e.target.value }))}
            />
            <Input
              label="API Base URL"
              placeholder="https://api.example.com/v1"
              value={settings.apiBaseUrl || ""}
              onChange={(e) => setSettings((p) => ({ ...p, apiBaseUrl: e.target.value }))}
            />
            <Button variant="primary" size="sm" loading={savingSettings} onClick={saveSettings} className="w-full">
              Guardar configuración
            </Button>
          </div>
        </Card>

        {/* Sync actions */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Sincronización manual
            </h3>
          </div>
          <div className="space-y-3">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <h4 className="text-white text-sm font-semibold mb-1">Fixture</h4>
              <p className="text-gray-500 text-xs mb-3">Actualiza los partidos programados desde el proveedor</p>
              <Button
                variant="secondary"
                size="sm"
                loading={syncing.fixtures}
                onClick={() => handleSync("fixtures")}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4" /> Sincronizar fixture
              </Button>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <h4 className="text-white text-sm font-semibold mb-1">Resultados</h4>
              <p className="text-gray-500 text-xs mb-3">Actualiza los marcadores y resultados finales</p>
              <Button
                variant="secondary"
                size="sm"
                loading={syncing.results}
                onClick={() => handleSync("results")}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4" /> Sincronizar resultados
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sync logs */}
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
          Historial de sincronizaciones ({recentLogs.length})
        </h3>
        {recentLogs.length === 0 && (
          <p className="text-gray-600 text-sm">Sin registros de sincronización</p>
        )}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
              <Badge variant={log.status === "success" ? "success" : log.status === "error" ? "error" : "warning"}>
                {log.status}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-semibold uppercase">{log.type}</span>
                  {log.itemsProcessed !== undefined && (
                    <span className="text-gray-600 text-xs">{log.itemsProcessed} items</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{log.message}</p>
              </div>
              <span className="text-gray-700 text-xs whitespace-nowrap flex-shrink-0">
                {new Date(log.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
