"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Users, Target, Trophy, Gift, Zap, RefreshCw, Calculator } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface StatsData {
  totalParticipants: number;
  totalPredictions: number;
  topScore: number;
}

interface RankingUser {
  position: number;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

interface SyncLog {
  id: string;
  type: string;
  status: string;
  message: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [statsRes, rankRes, logsRes] = await Promise.all([
        fetch("/api/public/stats"),
        fetch("/api/public/ranking"),
        fetch("/api/admin/sync/logs"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (rankRes.ok) setRanking(((await rankRes.json()).ranking || []).slice(0, 5));
      if (logsRes.ok) setSyncLogs(((await logsRes.json()).logs || []).slice(0, 5));
      setLoading(false);
    };
    init();
  }, []);

  const handleSync = async (type: "fixtures" | "results") => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/sync/${type}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al sincronizar");
        return;
      }
      toast.success(`Sincronización de ${type} completada`);
      // Refresh logs
      const logsRes = await fetch("/api/admin/sync/logs");
      if (logsRes.ok) setSyncLogs(((await logsRes.json()).logs || []).slice(0, 5));
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSyncing(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al recalcular");
        return;
      }
      toast.success("Puntos recalculados correctamente");
      // Refresh stats
      const statsRes = await fetch("/api/public/stats");
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const statCards = [
    { icon: Users, label: "Participantes", value: stats?.totalParticipants ?? 0, color: "text-blue-400" },
    { icon: Target, label: "Predicciones", value: stats?.totalPredictions ?? 0, color: "text-purple-400" },
    { icon: Trophy, label: "Puntos máximos", value: stats?.topScore ?? 0, color: "text-yellow-400" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del Prode Mundial Gamer 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-[#1a1a1a] ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider">{label}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Acciones rápidas
          </h2>
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              size="md"
              loading={syncing}
              onClick={() => handleSync("fixtures")}
              className="justify-start"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar Fixture
            </Button>
            <Button
              variant="secondary"
              size="md"
              loading={syncing}
              onClick={() => handleSync("results")}
              className="justify-start"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar Resultados
            </Button>
            <Button
              variant="secondary"
              size="md"
              loading={recalculating}
              onClick={handleRecalculate}
              className="justify-start"
            >
              <Calculator className="w-4 h-4" />
              Recalcular Puntos
            </Button>
          </div>
        </Card>

        {/* Top 5 ranking */}
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Top 5 ranking
          </h2>
          {ranking.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((u) => (
                <div key={u.position} className="flex items-center gap-3 py-1.5">
                  <Badge variant={u.position <= 3 ? (u.position === 1 ? "gold" : u.position === 2 ? "silver" : "bronze") : "position"}>
                    #{u.position}
                  </Badge>
                  <span className="text-white text-sm flex-1 font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="text-yellow-400 font-bold text-sm">{u.totalPoints} pts</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Sync logs */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Últimas sincronizaciones
          </h2>
          {syncLogs.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin sincronizaciones registradas</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <Badge variant={log.status === "success" ? "success" : log.status === "error" ? "error" : "warning"}>
                    {log.status}
                  </Badge>
                  <span className="text-gray-400 text-xs flex-1">{log.type}: {log.message}</span>
                  <span className="text-gray-700 text-xs">
                    {new Date(log.createdAt).toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
