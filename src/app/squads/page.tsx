"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Trophy, ChevronRight, X, Swords, Check, HelpCircle, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { GuidedTour } from "@/components/ui/GuidedTour";
import { shouldShowWelcomeModal } from "@/lib/welcome-modal";
import { apiFetch } from "@/lib/api";

const SQUADS_TOUR = [
  { icon: "👥", title: "Grupos privados", desc: "Los grupos son tu competencia interna con amigos, familia o trabajo. Cada grupo tiene su propio ranking." },
  { icon: "🏆", title: "Puntos independientes", desc: "Los puntos del grupo son completamente independientes del ranking global. No afectan ni suman al prode general ni a los premios oficiales." },
  { icon: "🎯", title: "Predicciones del grupo", desc: "Dentro de cada grupo hacés predicciones propias que se usan para el ranking interno. Son separadas de tus predicciones globales." },
  { icon: "🔗", title: "Invitá con código", desc: "Cuando creás un grupo recibís un código único. Compartilo con quien quieras para que se unan desde su perfil." },
  { icon: "🔥", title: "Modo Hardcore", desc: "Podés crear grupos con modo Hardcore donde hay que acertar el marcador exacto. Más difícil, más emocionante." },
];

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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const meRes = await apiFetch("/api/auth/me");
      if (meRes.status === 401) { router.push("/login"); return; }
      const userId = meRes.ok ? (await meRes.json()).user?.id : null;
      const res = await apiFetch("/api/participant/squads");
      if (res.status === 401) { router.push("/login"); return; }
      if (res.ok) {
        const data = await res.json();
        const loadedSquads = data.squads || [];
        setSquads(loadedSquads);
        setInvites(data.pendingInvites || []);
        if (userId && shouldShowWelcomeModal(`squads_welcome_${userId}`, loadedSquads.length > 0)) {
          setShowWelcomeModal(true);
        }
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

  const joinSquad = async () => {
    if (!joinCode.trim()) { toast.error("Ingresá el código del grupo"); return; }
    setJoining(true);
    try {
      const res = await apiFetch("/api/participant/squads/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.success("Ya sos miembro de ese grupo");
        router.push(`/squads/${data.squadId}`);
        return;
      }
      if (!res.ok) { toast.error(data.error || "Error al unirse"); return; }
      toast.success(`¡Te uniste a "${data.squadName}"!`);
      setShowJoin(false);
      setJoinCode("");
      router.push(`/squads/${data.squadId}`);
    } finally {
      setJoining(false);
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

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">Mis Grupos</h1>
                <p className="text-gray-500 text-sm mt-0.5">Competí con tus amigos</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="hidden sm:block">
                  <GuidedTour steps={SQUADS_TOUR} storageKey="squads_list_tour" buttonLabel="Ayuda" />
                </div>
                <div className="sm:hidden">
                  <GuidedTour steps={SQUADS_TOUR} storageKey="squads_list_tour" buttonLabel="" />
                </div>
                <button
                  onClick={() => setShowJoin(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-all text-sm font-semibold"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Unirse</span>
                </button>
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Crear grupo</span>
                  <span className="sm:hidden">Crear</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="mb-6 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2">
                Invitaciones pendientes
              </h2>
              {invites.map((inv) => (
                <div key={inv.id} className="bg-yellow-500/5 border border-yellow-600/25 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-white font-bold">{inv.squad.name}</p>
                      <p className="text-gray-500 text-sm">
                        Invitado por {inv.inviter.firstName} {inv.inviter.lastName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={actionLoading[inv.id]}
                        onClick={() => respondInvite(inv.id, "accept")}
                        className="bg-green-600 hover:bg-green-500 border-green-600"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={actionLoading[inv.id]}
                        onClick={() => respondInvite(inv.id, "decline")}
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Squads list */}
          {squads.length === 0 && invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center mb-4">
                <Swords className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-white font-bold text-lg mb-1">No estás en ningún grupo</p>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Creá uno e invitá a tus amigos, o usá un código para unirte a un grupo existente.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
                  <UserPlus className="w-4 h-4" /> Unirse con código
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Crear grupo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {squads.map((sq, i) => (
                <Link key={sq.id} href={`/squads/${sq.id}`}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className="group bg-[#0e0e0e] border border-[#1e1e1e] hover:border-[#2e2e2e] rounded-2xl p-4 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Position indicator */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        i === 0 ? "bg-yellow-500/15 text-yellow-400" :
                        i === 1 ? "bg-gray-400/10 text-gray-400" :
                        "bg-[#1a1a1a] text-gray-600"
                      }`}>
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold leading-tight">{sq.name}</span>
                          {sq.isHardcore && (
                            <Badge variant="error" className="text-[10px] py-0">HC</Badge>
                          )}
                          {sq.myRole === "admin" && (
                            <Badge variant="info" className="text-[10px] py-0">Admin</Badge>
                          )}
                        </div>
                        {sq.description && (
                          <p className="text-gray-600 text-xs mt-0.5 truncate">{sq.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> {sq._count.members}
                          </span>
                          <span className="text-yellow-500/80 text-xs flex items-center gap-1 font-semibold">
                            <Trophy className="w-3 h-3" /> {sq.myPoints} pts
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
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
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-white font-black text-lg">Nuevo grupo</h2>
                    <p className="text-gray-500 text-xs mt-0.5">Vas a ser el admin del grupo</p>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 mb-5">
                  <Input
                    label="Nombre del grupo"
                    placeholder="Los Cracks de la Facu"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && createSquad()}
                  />
                  <Input
                    label="Descripción (opcional)"
                    placeholder="Grupo del trabajo, familia..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, isHardcore: !p.isHardcore }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      form.isHardcore
                        ? "bg-red-600/10 border-red-600/40 text-white"
                        : "bg-[#0a0a0a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a]"
                    }`}
                  >
                    <div className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors ${form.isHardcore ? "bg-red-600" : "bg-gray-700"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isHardcore ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">Modo Hardcore</p>
                      <p className="text-xs text-gray-500 mt-0.5">Hay que acertar el marcador exacto</p>
                    </div>
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" loading={creating} onClick={createSquad} className="flex-1">
                    Crear grupo
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Join with code modal */}
      <AnimatePresence>
        {showJoin && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => !joining && setShowJoin(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#222] rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-white font-black text-lg">Unirse a un grupo</h2>
                    <p className="text-gray-500 text-xs mt-0.5">Ingresá el código que te compartieron</p>
                  </div>
                  <button onClick={() => setShowJoin(false)} className="text-gray-600 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-5">
                  <Input
                    label="Código del grupo"
                    placeholder="ej: abc123xyz"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && joinSquad()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowJoin(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" loading={joining} onClick={joinSquad} className="flex-1">
                    Unirse
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* First-time welcome modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm" onClick={() => setShowWelcomeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-[#111] border border-orange-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto max-h-[85vh] overflow-y-auto">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">👥</div>
                  <h2 className="text-white font-black text-xl mb-1">¡Jugá con tus amigos!</h2>
                  <p className="text-gray-400 text-sm">Competencia privada con quien vos elijas</p>
                </div>
                <div className="space-y-2 mb-4">
                  {[
                    { icon: "🏆", title: "Tu ranking privado", desc: "Dentro del grupo se arma un ranking propio. Comparan sus predicciones entre ustedes." },
                    { icon: "⚽", title: "Cada uno predice", desc: "Los integrantes hacen sus predicciones de partidos, grupos y eliminatorias." },
                    { icon: "🎯", title: "Puntos internos", desc: "Los puntos del grupo son independientes. No afectan al ranking global del torneo." },
                    { icon: "🔗", title: "Invitá con código", desc: "Compartís un código único para que tus amigos se unan desde su perfil." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#222]">
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{item.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-center mb-4">
                  <p className="text-amber-400/90 text-xs">⚠️ Los puntos de grupos <strong>no influyen</strong> en el ranking global ni en los premios del torneo.</p>
                </div>
                <button onClick={() => setShowWelcomeModal(false)}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-colors text-sm uppercase tracking-wider">
                  ¡Entendido, a jugar!
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
