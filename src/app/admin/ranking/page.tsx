"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Calculator, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface RankingUser {
  position: number;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

export default function AdminRankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchRanking = async () => {
    const res = await fetch("/api/public/ranking");
    if (res.ok) setRanking((await res.json()).ranking || []);
  };

  useEffect(() => {
    fetchRanking().finally(() => setLoading(false));
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      if (!res.ok) { toast.error("Error al recalcular"); return; }
      toast.success("Puntos recalculados correctamente");
      await fetchRanking();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRecalculating(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Posición", "Nombre", "Apellido", "Puntos"],
      ...ranking.map((u) => [u.position, u.firstName, u.lastName, u.totalPoints]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking-prode-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Ranking</h1>
          <p className="text-gray-500 text-sm">{ranking.length} participantes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button variant="primary" size="sm" loading={recalculating} onClick={handleRecalculate}>
            <Calculator className="w-4 h-4" /> Recalcular puntos
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222]">
                {["Posición", "Nombre", "Apellido", "Puntos totales"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((u) => (
                <tr key={u.position} className="border-b border-[#1a1a1a] hover:bg-[#151515]">
                  <td className="px-4 py-3">
                    <Badge variant={u.position === 1 ? "gold" : u.position === 2 ? "silver" : u.position === 3 ? "bronze" : "position"}>
                      #{u.position}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{u.firstName}</td>
                  <td className="px-4 py-3 text-gray-400">{u.lastName}</td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-400 font-black text-lg">{u.totalPoints}</span>
                    <span className="text-gray-600 text-xs ml-1">pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ranking.length === 0 && (
            <div className="py-10 text-center text-gray-600">Sin datos de ranking aún</div>
          )}
        </div>
      </Card>
    </div>
  );
}
