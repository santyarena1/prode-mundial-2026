"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Team {
  id: string;
  name: string;
  code: string;
}

interface Match {
  id: string;
  matchCode: string;
  phase: string;
  status: string;
  startDate?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  homeScore?: number;
  awayScore?: number;
  realOutcome?: string;
  winnerTeamId?: string;
}

interface ResultForm {
  homeScore: string;
  awayScore: string;
  winnerId: string;
}

export default function AdminResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, ResultForm>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((data) => {
        const matchList: Match[] = data.matches || [];
        setMatches(matchList);
        const initForms: Record<string, ResultForm> = {};
        for (const m of matchList) {
          initForms[m.id] = {
            homeScore: m.homeScore !== undefined && m.homeScore !== null ? String(m.homeScore) : "",
            awayScore: m.awayScore !== undefined && m.awayScore !== null ? String(m.awayScore) : "",
            winnerId: m.winnerTeamId || "",
          };
        }
        setForms(initForms);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (matchId: string, field: keyof ResultForm, value: string) => {
    setForms((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
  };

  const saveResult = async (match: Match) => {
    const form = forms[match.id];
    if (!form) return;
    setSaving((prev) => ({ ...prev, [match.id]: true }));
    try {
      const homeScore = parseInt(form.homeScore);
      const awayScore = parseInt(form.awayScore);
      let realOutcome: string | undefined;
      if (!isNaN(homeScore) && !isNaN(awayScore)) {
        if (homeScore > awayScore) realOutcome = "home";
        else if (awayScore > homeScore) realOutcome = "away";
        else realOutcome = "draw";
      }
      const res = await fetch(`/api/admin/matches/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: isNaN(homeScore) ? undefined : homeScore,
          awayScore: isNaN(awayScore) ? undefined : awayScore,
          realOutcome,
          winnerTeamId: form.winnerId || undefined,
          status: "finished",
        }),
      });
      if (!res.ok) {
        toast.error("Error al guardar resultado");
        return;
      }
      toast.success("Resultado guardado");
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, homeScore: isNaN(homeScore) ? m.homeScore : homeScore, awayScore: isNaN(awayScore) ? m.awayScore : awayScore, status: "finished" }
            : m
        )
      );
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  const handleSync = async (type: "fixtures" | "results") => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/sync/${type}`, { method: "POST" });
      if (!res.ok) { toast.error("Error al sincronizar"); return; }
      toast.success(`Sincronización de ${type} completada`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Resultados</h1>
          <p className="text-gray-500 text-sm">{matches.length} partidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={syncing} onClick={() => handleSync("fixtures")}>
            <RefreshCw className="w-4 h-4" /> Sync Fixture
          </Button>
          <Button variant="secondary" size="sm" loading={syncing} onClick={() => handleSync("results")}>
            <RefreshCw className="w-4 h-4" /> Sync Results
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const form = forms[match.id];
          const homeName = match.homeTeam?.name || match.homePlaceholder || "TBD";
          const awayName = match.awayTeam?.name || match.awayPlaceholder || "TBD";
          if (!form) return null;

          return (
            <Card key={match.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs">{match.phase.replace(/_/g, " ")}</Badge>
                    <Badge variant={match.status === "finished" ? "success" : match.status === "live" ? "warning" : "default"}>
                      {match.status}
                    </Badge>
                    <span className="text-gray-600 text-xs font-mono">{match.matchCode}</span>
                  </div>
                  <div className="text-white font-semibold text-sm">
                    {homeName} vs {awayName}
                  </div>
                  {match.startDate && (
                    <div className="text-gray-600 text-xs mt-0.5">
                      {new Date(match.startDate).toLocaleString("es-AR")}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-gray-500 text-xs w-16 text-right truncate">{homeName}</div>
                    <input
                      type="number"
                      min={0}
                      value={form.homeScore}
                      onChange={(e) => updateForm(match.id, "homeScore", e.target.value)}
                      className="w-12 bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:border-red-500"
                      placeholder="-"
                    />
                    <span className="text-gray-600">:</span>
                    <input
                      type="number"
                      min={0}
                      value={form.awayScore}
                      onChange={(e) => updateForm(match.id, "awayScore", e.target.value)}
                      className="w-12 bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:border-red-500"
                      placeholder="-"
                    />
                    <div className="text-gray-500 text-xs w-16 truncate">{awayName}</div>
                  </div>

                  {(match.homeTeam || match.awayTeam) && (
                    <select
                      className="bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-red-500"
                      value={form.winnerId}
                      onChange={(e) => updateForm(match.id, "winnerId", e.target.value)}
                    >
                      <option value="">Ganador...</option>
                      {match.homeTeam && <option value={match.homeTeam.id}>{homeName}</option>}
                      {match.awayTeam && <option value={match.awayTeam.id}>{awayName}</option>}
                    </select>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    loading={saving[match.id]}
                    onClick={() => saveResult(match)}
                  >
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
