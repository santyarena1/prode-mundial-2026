"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Swords, Trash2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Squad {
  id: string;
  name: string;
  description?: string;
  isHardcore: boolean;
  inviteCode: string;
  createdAt: string;
  creator: { firstName: string; lastName: string; email: string };
  _count: { members: number; prizes: number };
}

export default function AdminSquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/squads");
    if (res.ok) {
      const data = await res.json();
      setSquads(data.squads || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteSquad = async (id: string, name: string) => {
    if (!confirm(`¿Disolver el grupo "${name}"? Se eliminarán todas las predicciones y premios del grupo.`)) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/squads/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Error al eliminar"); return; }
      toast.success("Grupo eliminado");
      setSquads((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Grupos de amigos</h2>
        <span className="text-gray-500 text-sm">{squads.length} grupos</span>
      </div>

      {squads.length === 0 && (
        <Card className="p-10 text-center">
          <Swords className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500">No hay grupos creados todavía</p>
        </Card>
      )}

      <div className="space-y-2">
        {squads.map((sq) => (
          <Card key={sq.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold">{sq.name}</span>
                  {sq.isHardcore && <Badge variant="error" className="text-[10px]">Hardcore</Badge>}
                  <span className="font-mono text-gray-600 text-xs">{sq.inviteCode}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  Creado por {sq.creator.firstName} {sq.creator.lastName} · {sq.creator.email}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-gray-600 text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" /> {sq._count.members} miembros
                  </span>
                  <span className="text-gray-600 text-xs">
                    {sq._count.prizes} premios
                  </span>
                  <span className="text-gray-700 text-xs">
                    {new Date(sq.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/squads/${sq.id}`}>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" /> Ver detalle
                  </Button>
                </Link>
                <button
                  onClick={() => deleteSquad(sq.id, sq.name)}
                  disabled={deleting[sq.id]}
                  className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                  title="Eliminar grupo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {sq.description && <p className="text-gray-600 text-xs mt-2">{sq.description}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
