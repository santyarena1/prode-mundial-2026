"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Group {
  id: string;
  name: string;
  _count?: { teams: number; matches: number };
}

interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string;
  group?: Group;
  groupId?: string;
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
}

export default function AdminFixturePage() {
  const [activeTab, setActiveTab] = useState<"groups" | "teams" | "matches">("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newTeam, setNewTeam] = useState({ name: "", code: "", flagUrl: "", groupId: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState("");

  useEffect(() => {
    const init = async () => {
      const [gRes, tRes, mRes] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch("/api/admin/teams"),
        fetch("/api/admin/matches"),
      ]);
      if (gRes.ok) setGroups((await gRes.json()).groups || []);
      if (tRes.ok) setTeams((await tRes.json()).teams || []);
      if (mRes.ok) setMatches((await mRes.json()).matches || []);
      setLoading(false);
    };
    init();
  }, []);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    if (!res.ok) { toast.error("Error al crear grupo"); return; }
    const data = await res.json();
    setGroups((prev) => [...prev, data.group]);
    setNewGroupName("");
    toast.success("Grupo creado");
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    toast.success("Grupo eliminado");
  };

  const addTeam = async () => {
    if (!newTeam.name || !newTeam.code) { toast.error("Nombre y código son requeridos"); return; }
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTeam.name,
        code: newTeam.code.toUpperCase(),
        flagUrl: newTeam.flagUrl || undefined,
        groupId: newTeam.groupId || undefined,
      }),
    });
    if (!res.ok) { toast.error("Error al crear equipo"); return; }
    const data = await res.json();
    setTeams((prev) => [...prev, data.team]);
    setNewTeam({ name: "", code: "", flagUrl: "", groupId: "" });
    toast.success("Equipo creado");
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setTeams((prev) => prev.filter((t) => t.id !== id));
    toast.success("Equipo eliminado");
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    setUploading(true);
    try {
      const res = await fetch("/api/admin/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al importar"); return; }
      toast.success(`CSV importado: ${data.created} registros creados`);
      // Refresh
      const [gRes, tRes, mRes] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch("/api/admin/teams"),
        fetch("/api/admin/matches"),
      ]);
      if (gRes.ok) setGroups((await gRes.json()).groups || []);
      if (tRes.ok) setTeams((await tRes.json()).teams || []);
      if (mRes.ok) setMatches((await mRes.json()).matches || []);
    } catch {
      toast.error("Error al procesar CSV");
    } finally {
      setUploading(false);
      setCsvFile(null);
    }
  };

  const filteredMatches = phaseFilter ? matches.filter((m) => m.phase === phaseFilter) : matches;
  const phases = [...new Set(matches.map((m) => m.phase))];

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Fixture</h1>
        <p className="text-gray-500 text-sm">{matches.length} partidos · {teams.length} equipos · {groups.length} grupos</p>
      </div>

      {/* CSV Import */}
      <Card className="p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Upload className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-400 font-medium">Importar desde CSV</p>
          <p className="text-xs text-gray-600">Columnas: matchCode, phase, groupName, homeCode, awayCode, startDate</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <span className="bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white text-xs px-3 py-2 rounded-lg transition-colors">
              {csvFile ? csvFile.name : "Elegir archivo"}
            </span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button variant="secondary" size="sm" loading={uploading} onClick={handleCSVUpload} disabled={!csvFile}>
            Importar
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6 max-w-sm">
        {(["groups", "teams", "matches"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "groups" ? "Grupos" : tab === "teams" ? "Equipos" : "Partidos"}
          </button>
        ))}
      </div>

      {/* GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del grupo (ej: A)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
              />
              <Button variant="primary" size="md" onClick={addGroup}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {groups.map((g) => (
              <Card key={g.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Grupo {g.name}</div>
                  <div className="text-gray-600 text-xs">{g._count?.teams ?? 0} equipos</div>
                </div>
                <button
                  onClick={() => deleteGroup(g.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS TAB */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <Input placeholder="Nombre" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Código (ARG)" value={newTeam.code} onChange={(e) => setNewTeam((p) => ({ ...p, code: e.target.value }))} />
              <Input placeholder="URL bandera" value={newTeam.flagUrl} onChange={(e) => setNewTeam((p) => ({ ...p, flagUrl: e.target.value }))} />
              <select
                className="bg-[#111] border border-[#333] text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={newTeam.groupId}
                onChange={(e) => setNewTeam((p) => ({ ...p, groupId: e.target.value }))}
              >
                <option value="">Sin grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>Grupo {g.name}</option>
                ))}
              </select>
            </div>
            <Button variant="primary" size="sm" onClick={addTeam}>
              <Plus className="w-4 h-4" /> Agregar equipo
            </Button>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222]">
                  {["Código", "Nombre", "Grupo", "Bandera", ""].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b border-[#1a1a1a] hover:bg-[#151515]">
                    <td className="px-4 py-2">
                      <Badge variant="default">{t.code}</Badge>
                    </td>
                    <td className="px-4 py-2 text-white text-sm">{t.name}</td>
                    <td className="px-4 py-2 text-gray-500 text-sm">
                      {t.group ? `Grupo ${t.group.name}` : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {t.flagUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.flagUrl} alt={t.name} className="w-8 h-5 object-cover rounded-sm" />
                      ) : (
                        <span className="text-gray-700 text-xs">Sin bandera</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => deleteTeam(t.id)} className="text-gray-600 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATCHES TAB */}
      {activeTab === "matches" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPhaseFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors ${
                !phaseFilter ? "bg-red-600 border-red-500 text-white" : "border-[#333] text-gray-500 hover:text-white"
              }`}
            >
              Todos
            </button>
            {phases.map((ph) => (
              <button
                key={ph}
                onClick={() => setPhaseFilter(ph)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors ${
                  phaseFilter === ph ? "bg-red-600 border-red-500 text-white" : "border-[#333] text-gray-500 hover:text-white"
                }`}
              >
                {ph.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222]">
                  {["Código", "Fase", "Local", "Visitante", "Fecha", "Estado"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m) => (
                  <tr key={m.id} className="border-b border-[#1a1a1a] hover:bg-[#151515]">
                    <td className="px-4 py-2 text-gray-400 text-xs font-mono">{m.matchCode}</td>
                    <td className="px-4 py-2">
                      <Badge variant="default" className="text-xs">{m.phase.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-2 text-white text-sm">{m.homeTeam?.name || m.homePlaceholder || "TBD"}</td>
                    <td className="px-4 py-2 text-white text-sm">{m.awayTeam?.name || m.awayPlaceholder || "TBD"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {m.startDate ? new Date(m.startDate).toLocaleDateString("es-AR") : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={m.status === "finished" ? "success" : m.status === "live" ? "warning" : "default"}>
                        {m.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMatches.length === 0 && (
              <div className="py-8 text-center text-gray-600 text-sm">No hay partidos</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
