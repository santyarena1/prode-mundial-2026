"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Trophy, ChevronRight, X, Swords, Check, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface Squad {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  isHardcore: boolean;
  createdBy: string;
  _count: { members: number };
  creator: { id: string; firstName: string; lastName: string };
  myMemberId: string;
  myRole: string;
  myPoints: number;
}

interface PendingInvite {
  id: string;
  squad: { id: string; name: string };
  inviter: { firstName: string; lastName: string };
}

export default function SquadsPage() {
  const router = useRouter();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isHardcore: false });
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/participant/squads");
      if (res.status === 401) { router.push("/login"); return; }
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads || []);
        setInvites(data.pendingInvites || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createSquad = async () => {
    if (!form.name.trim()) { toast.error("Poné un nombre al grupo"); return; }
    setCreating(true);
    try {
      const res = await apiFetch("/api/participant/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al crear"); return; }
      toast.success(`Grupo "${data.squad.name}" creado`);
      setShowCreate(false);
      setForm({ name: "", description: "", isHardcore: false });
      router.push(`/squads/${data.squad.id}`);
    } finally {
      setCreating(false);
    }
  };

  const respondInvite = async (inviteId: string, action: "accept" | "decline") => {
    setActionLoading((p) => ({ ...p, [inviteId]: true }));
    try {
      const res = await apiFetch(`/api/participant/squads/invites/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error"); return; }
      if (action === "accept") {
        toast.success("¡Te uniste al grupo!");
        router.push(`/squads/${data.squadId}`);
      } else {
        toast.success("Invitación rechazada");
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } finally {
      setActionLoading((p) => ({ ...p, [inviteId]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white">Mis Grupos</h1>
              <p className="text-gray-500 text-sm">Competí con tus amigos</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Crear grupo
            </Button>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="mb-6 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2">
                Invitaciones pendientes
              </h2>
              {invites.map((inv) => (
                <Card key={inv.id} className="p-4 border-yellow-600/30">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-white font-bold">{inv.squad.name}</p>
                      <p className="text-gray-500 text-sm">
                        de {inv.inviter.firstName} {inv.inviter.lastName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={actionLoading[inv.id]}
                        onClick={() => respondInvite(inv.id, "accept")}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        <Check className="w-3 h-3" /> Aceptar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={actionLoading[inv.id]}
                        onClick={() => respondInvite(inv.id, "decline")}
                      >
                        <X className="w-3 h-3" /> Rechazar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Squads list */}
          {squads.length === 0 && invites.length === 0 ? (
            <Card className="p-10 text-center">
              <Swords className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold mb-1">No estás en ningún grupo</p>
              <p className="text-gray-600 text-sm mb-5">
                Creá uno e invitá a tus amigos para competir juntos.
              </p>
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Crear grupo
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {squads.map((sq) => (
                <Link key={sq.id} href={`/squads/${sq.id}`}>
                  <Card className="p-4 hover:border-red-600/40 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold truncate">{sq.name}</span>
                          {sq.isHardcore && (
                            <Badge variant="error" className="text-[10px]">Hardcore</Badge>
                          )}
                          {sq.myRole === "admin" && (
                            <Badge variant="info" className="text-[10px]">Admin</Badge>
                          )}
                        </div>
                        {sq.description && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{sq.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sq._count.members} miembros
                          </span>
                          <span className="text-yellow-500 text-xs flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {sq.myPoints} pts
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-black text-lg">Nuevo grupo</h2>
                  <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 mb-4">
                  <Input
                    label="Nombre del grupo"
                    placeholder="Los Cracks de la Facu"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label="Descripción (opcional)"
                    placeholder="Grupo del trabajo, familia..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setForm((p) => ({ ...p, isHardcore: !p.isHardcore }))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${form.isHardcore ? "bg-red-600" : "bg-gray-700"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isHardcore ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-sm text-gray-300">
                      Modo Hardcore <span className="text-gray-600">(hay que acertar el marcador exacto)</span>
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" loading={creating} onClick={createSquad} className="flex-1">
                    Crear
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
