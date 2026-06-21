"use client";

import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserX, UserCheck, RefreshCcw, KeyRound, X, Eye, EyeOff, ExternalLink, ChevronUp, ChevronDown, Users, UserPlus, CalendarDays, TrendingUp, Target, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface ParticipantStats {
  total: number;
  joinedToday: number;
  joinedWeek: number;
  joinedMonth: number;
  withPredictions: number;
  missingPredictions: number;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagram?: string;
  totalPoints: number;
  isBlocked: boolean;
  hasPassword?: boolean;
  emailVerified?: boolean;
  referredById?: string | null;
  createdAt: string;
  _count?: { predictions: number };
  squadMemberships?: { role: string; squad: { id: string; name: string } }[];
}

type PredictionResetType = "matches" | "groups" | "bracket";
type SortField = "name" | "points" | "predictions" | "createdAt" | "status";
type SortDir = "asc" | "desc";

interface PredictionSummary {
  total: number;
  locked: number;
}

const RESET_OPTIONS: {
  type: PredictionResetType;
  label: string;
  description: string;
}[] = [
  {
    type: "matches",
    label: "Partidos",
    description: "Resultados de la fase de grupos (local, visitante o empate)",
  },
  {
    type: "groups",
    label: "Posiciones de grupos",
    description: "1° y 2° de cada grupo",
  },
  {
    type: "bracket",
    label: "Eliminatorias y campeón",
    description: "16vos, octavos, cuartos, semis y campeón del mundo",
  },
];

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<ParticipantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [resetModal, setResetModal] = useState<Participant | null>(null);
  const [resetSummary, setResetSummary] = useState<Record<PredictionResetType, PredictionSummary> | null>(null);
  const [resetSummaryLoading, setResetSummaryLoading] = useState(false);
  const [selectedResetTypes, setSelectedResetTypes] = useState<PredictionResetType[]>([]);
  const [savingReset, setSavingReset] = useState(false);
  const [passwordModal, setPasswordModal] = useState<Participant | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [predFilter, setPredFilter] = useState<"all" | "none" | "incomplete">("all");

  useEffect(() => {
    apiFetch("/api/admin/participants")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          toast.error(data.error || "No se pudieron cargar los participantes");
          return;
        }
        setParticipants(data.users || []);
        setStats(data.stats ?? null);
      })
      .catch(() => toast.error("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? participants.filter(
          (p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q) ||
            p.phone.includes(q)
        )
      : [...participants];

    if (predFilter === "none") list = list.filter((p) => (p._count?.predictions ?? 0) === 0);
    else if (predFilter === "incomplete") list = list.filter((p) => (p._count?.predictions ?? 0) < 72);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":      cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`); break;
        case "points":    cmp = a.totalPoints - b.totalPoints; break;
        case "predictions": cmp = (a._count?.predictions ?? 0) - (b._count?.predictions ?? 0); break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case "status":    cmp = Number(a.isBlocked) - Number(b.isBlocked); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [participants, search, sortField, sortDir, predFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20 inline ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-red-400 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 text-red-400 inline ml-0.5" />;
  };

  const toggleBlock = async (id: string, isBlocked: boolean) => {
    setToggling((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/admin/participants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !isBlocked }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar usuario");
        return;
      }
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isBlocked: !isBlocked } : p))
      );
      toast.success(isBlocked ? "Usuario desbloqueado" : "Usuario bloqueado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openResetModal = async (p: Participant) => {
    setResetModal(p);
    setSelectedResetTypes([]);
    setResetSummary(null);
    setResetSummaryLoading(true);
    try {
      const res = await apiFetch(`/api/admin/participants/${p.id}/reset-predictions`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo cargar el resumen");
        setResetModal(null);
        return;
      }
      setResetSummary(data.summary);
    } catch {
      toast.error("Error de conexión");
      setResetModal(null);
    } finally {
      setResetSummaryLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetModal(null);
    setResetSummary(null);
    setSelectedResetTypes([]);
  };

  const toggleResetType = (type: PredictionResetType) => {
    setSelectedResetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const confirmResetPredictions = async () => {
    if (!resetModal) return;
    if (selectedResetTypes.length === 0) {
      toast.error("Seleccioná al menos un tipo de predicción");
      return;
    }

    setSavingReset(true);
    try {
      const res = await apiFetch(`/api/admin/participants/${resetModal.id}/reset-predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: selectedResetTypes }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al resetear");
        return;
      }
      // Build count summary for feedback
      const counts = Object.values(data.unlocked as Record<string, number>).reduce((a, b) => a + b, 0);
      toast.success(`${counts > 0 ? `${counts} predicciones desbloqueadas` : "Desbloqueado"} — el usuario debe actualizar su página de predicciones`);
      // Re-fetch summary to confirm 0 locked remain
      const summaryRes = await apiFetch(`/api/admin/participants/${resetModal.id}/reset-predictions`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setResetSummary(summaryData.summary);
        setSelectedResetTypes([]);
      } else {
        closeResetModal();
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingReset(false);
    }
  };

  const openPasswordModal = (p: Participant) => {
    setPasswordModal(p);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const closePasswordModal = () => {
    setPasswordModal(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiFetch(`/api/admin/participants/${passwordModal.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar la contraseña");
        return;
      }
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === passwordModal.id ? { ...p, hasPassword: true } : p
        )
      );
      toast.success(data.message);
      closePasswordModal();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Participantes</h1>
          <p className="text-gray-500 text-sm">
            {stats ? `${stats.total.toLocaleString("es-AR")} registrados en total` : `${participants.length} registrados`}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-blue-400", sub: "registrados" },
            { label: "Hoy", value: stats.joinedToday, icon: UserPlus, color: "text-emerald-400", sub: "nuevos hoy" },
            { label: "7 días", value: stats.joinedWeek, icon: TrendingUp, color: "text-cyan-400", sub: "última semana" },
            { label: "Este mes", value: stats.joinedMonth, icon: CalendarDays, color: "text-violet-400", sub: "registros del mes" },
            { label: "Con predicciones", value: stats.withPredictions, icon: Target, color: "text-amber-400", sub: "ya predijeron algo" },
            { label: "Faltan predicciones", value: stats.missingPredictions, icon: ClipboardList, color: "text-orange-400", sub: "sin ninguna predicción" },
          ].map((item) => (
            <Card key={item.label} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 truncate">{item.label}</p>
                  <p className={`text-2xl font-black tabular-nums mt-0.5 ${item.color}`}>
                    {item.value.toLocaleString("es-AR")}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate">{item.sub}</p>
                </div>
                <item.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${item.color} opacity-70`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre, email, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {(["all", "incomplete", "none"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPredFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                predFilter === f
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-[#141414] border-[#2a2a2a] text-gray-400 hover:border-[#444] hover:text-gray-200"
              }`}
            >
              {f === "all" ? "Todos" : f === "incomplete" ? "Incompletas" : "Sin ninguna"}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222]">
              {([
                { label: "Participante", field: "name" as SortField },
                { label: "Puntaje / Preds.", field: "points" as SortField },
                { label: "Grupos", field: null },
                { label: "Estado", field: "status" as SortField },
                { label: "Acciones", field: null },
              ]).map(({ label, field }) => (
                <th
                  key={label}
                  onClick={field ? () => handleSort(field) : undefined}
                  className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 select-none ${field ? "cursor-pointer hover:text-gray-300 transition-colors" : ""}`}
                >
                  {label}
                  {field && <SortIcon field={field} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-[#1a1a1a] hover:bg-[#151515] transition-colors"
              >
                {/* Participante */}
                <td className="px-4 py-3 min-w-0">
                  <div className="text-white font-medium text-sm leading-tight">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{p.email}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-gray-600 text-xs">{p.phone}</span>
                    {p.instagram && (
                      <span className="text-gray-700 text-xs">· @{p.instagram}</span>
                    )}
                    {!p.hasPassword && (
                      <span className="text-amber-500/80 text-[10px] font-semibold">· Sin contraseña</span>
                    )}
                  </div>
                </td>

                {/* Puntaje / Predicciones */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-yellow-400 font-bold text-sm">{p.totalPoints} pts</div>
                  <div className="text-gray-600 text-xs mt-0.5">{p._count?.predictions ?? 0} preds.</div>
                </td>

                {/* Grupos */}
                <td className="px-4 py-3">
                  {p.squadMemberships && p.squadMemberships.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.squadMemberships.map((sm) => (
                        <span
                          key={sm.squad.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            sm.role === "admin"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-[#2a2a2a] text-gray-400"
                          }`}
                          title={sm.role === "admin" ? "Admin del grupo" : "Miembro"}
                        >
                          {sm.squad.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-700 text-xs">—</span>
                  )}
                </td>

                {/* Estado + fecha */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant={p.isBlocked ? "error" : "success"}>
                      {p.isBlocked ? "Bloqueado" : "Activo"}
                    </Badge>
                    {p.referredById && (
                      p.emailVerified ? (
                        <Badge variant="success">Email verificado</Badge>
                      ) : (
                        <Badge variant="warning">Email sin verificar</Badge>
                      )
                    )}
                  </div>
                  <div className="text-gray-700 text-[10px] mt-1">
                    {new Date(p.createdAt).toLocaleDateString("es-AR")}
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/participants/${p.id}`}>
                      <Button variant="secondary" size="sm" title="Ver perfil completo">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openPasswordModal(p)}
                      title="Cambiar contraseña"
                    >
                      <KeyRound className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openResetModal(p)}
                      title="Desbloquear predicciones"
                    >
                      <RefreshCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant={p.isBlocked ? "secondary" : "danger"}
                      size="sm"
                      loading={toggling[p.id]}
                      onClick={() => toggleBlock(p.id, p.isBlocked)}
                      title={p.isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                    >
                      {p.isBlocked ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-600">No hay participantes que coincidan</div>
        )}
      </Card>

      <AnimatePresence>
        {resetModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={closeResetModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <Card className="w-full max-w-lg p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white font-black uppercase text-lg flex items-center gap-2">
                      <RefreshCcw className="w-5 h-5 text-blue-400" />
                      Desbloquear predicciones
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {resetModal.firstName} {resetModal.lastName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeResetModal}
                    disabled={savingReset}
                    className="text-gray-600 hover:text-gray-400"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  Elegí qué secciones querés desbloquear para que el usuario pueda modificarlas de nuevo.
                </p>

                {resetSummaryLoading ? (
                  <p className="text-gray-600 text-sm text-center py-6">Cargando...</p>
                ) : (
                  <div className="space-y-2 mb-5">
                    {RESET_OPTIONS.map((opt) => {
                      const stats = resetSummary?.[opt.type];
                      const checked = selectedResetTypes.includes(opt.type);
                      const disabled = !stats?.total;
                      return (
                        <label
                          key={opt.type}
                          className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            disabled
                              ? "opacity-40 cursor-not-allowed border-[#1a1a1a] bg-[#0d0d0d]"
                              : checked
                                ? "border-blue-500/40 bg-blue-500/10"
                                : "border-[#222] bg-[#111] hover:border-[#333]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 accent-blue-500"
                            checked={checked}
                            disabled={disabled || savingReset}
                            onChange={() => !disabled && toggleResetType(opt.type)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-white text-sm font-bold">{opt.label}</p>
                              {stats && (
                                <span className="text-gray-500 text-xs shrink-0">
                                  {stats.locked}/{stats.total} bloqueadas
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">{opt.description}</p>
                            {stats && stats.total === 0 && (
                              <p className="text-gray-600 text-[10px] mt-1">Sin predicciones cargadas</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={closeResetModal}
                    disabled={savingReset}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="flex-1"
                    loading={savingReset}
                    disabled={resetSummaryLoading || selectedResetTypes.length === 0}
                    onClick={confirmResetPredictions}
                  >
                    Desbloquear selección
                  </Button>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passwordModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={closePasswordModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <Card className="w-full max-w-md p-6 pointer-events-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white font-black uppercase text-lg flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-400" />
                      Contraseña
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {passwordModal.firstName} {passwordModal.lastName}
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">{passwordModal.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    disabled={savingPassword}
                    className="text-gray-600 hover:text-gray-400"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  {passwordModal.hasPassword
                    ? "Definí una contraseña nueva. El usuario la usará para ingresar."
                    : "Este usuario no tiene contraseña. Creá una para que pueda entrar."}
                </p>

                <form onSubmit={savePassword} className="flex flex-col gap-4">
                  <div className="relative">
                    <Input
                      label="Contraseña nueva"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300"
                      aria-label="Mostrar contraseña"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    label="Repetir contraseña"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                  />
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={closePasswordModal}
                      disabled={savingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="flex-1"
                      loading={savingPassword}
                    >
                      Guardar
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
