"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Target, Star, Gift, Zap, ChevronRight, User, TrendingUp, CheckCircle2, BookOpen,
  Clock, Shuffle, Package, XCircle, Users, X, Ticket,
} from "lucide-react";
import { VirtualAlbumModal } from "@/components/dashboard/VirtualAlbumModal";
import { SponsorCTA } from "@/components/home/SponsorCTA";
import { EarlyBirdModal } from "@/components/home/EarlyBirdModal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalPoints: number;
  predictionPoints: number;
  bonusPoints: number;
  spentPoints: number;
  earlyBirdGranted: boolean;
  earlyBirdEligible?: boolean;
}

interface RankingUser {
  position: number;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

interface FixtureMatch {
  id: string;
  phase: string;
  status: string;
}

interface Redemption {
  id: string;
  status: string;
  pointsSpent: number;
  createdAt: string;
  prize: { name: string; imageUrl?: string | null; prizeType: string };
}

interface WeeklyRaffle {
  id: string;
  title: string;
  description?: string | null;
  prize: string;
  scheduledAt: string;
  status: string;
  winnerName?: string | null;
  winnerInstagram?: string | null;
}

function getRaffleDisplayStatus(raffle: WeeklyRaffle): { label: string; variant: "info" | "warning" | "success" | "error" | "default" } {
  if (raffle.status === "completed") return { label: "Realizado ✓", variant: "success" };
  if (raffle.status === "cancelled") return { label: "Cancelado", variant: "error" };
  const now = new Date();
  const date = new Date(raffle.scheduledAt);
  const today = now.toDateString();
  const raffleDay = date.toDateString();
  if (today === raffleDay) {
    const diffMs = date.getTime() - now.getTime();
    if (Math.abs(diffMs) < 2 * 60 * 60 * 1000) return { label: "🔴 EN VIVO", variant: "warning" };
    if (diffMs > 0) return { label: "¡Es hoy! 🎯", variant: "warning" };
    return { label: "Vencido", variant: "default" };
  }
  if (date < now) return { label: "Vencido", variant: "default" };
  return { label: "Próximo", variant: "info" };
}

const REDEMPTION_STATUS: Record<string, { label: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", icon: <Clock className="w-3 h-3" /> },
  delivered: { label: "Entregado", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rechazado", icon: <XCircle className="w-3 h-3" /> },
};

const actionCards = [
  {
    href: "/predictions",
    icon: <Target className="w-6 h-6" />,
    title: "Cargar predicciones",
    description: "Predecí resultados de los partidos",
    color: "text-red-500",
    bg: "bg-red-600/10 border-red-600/20",
  },
  {
    href: "/my-predictions",
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Mis predicciones",
    description: "Ver tus predicciones guardadas",
    color: "text-blue-400",
    bg: "bg-blue-600/10 border-blue-600/20",
  },
  {
    href: "/ranking",
    icon: <Trophy className="w-6 h-6" />,
    title: "Ver ranking",
    description: "Tu posición entre todos los jugadores",
    color: "text-yellow-400",
    bg: "bg-yellow-600/10 border-yellow-600/20",
  },
  {
    href: "/prizes",
    icon: <Gift className="w-6 h-6" />,
    title: "Canjeá tus premios",
    description: "Tus puntos por productos gaming",
    color: "text-purple-400",
    bg: "bg-purple-600/10 border-purple-600/20",
  },
  {
    href: "/bonuses",
    icon: <Zap className="w-6 h-6" />,
    title: "Ganá puntos extra",
    description: "Código de compra y acciones bonus",
    color: "text-green-400",
    bg: "bg-green-600/10 border-green-600/20",
  },
  {
    href: "/squads",
    icon: <Users className="w-6 h-6" />,
    title: "Grupos",
    description: "Competí con tus amigos en privado",
    color: "text-orange-400",
    bg: "bg-orange-600/10 border-orange-600/20",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [predictedMatches, setPredictedMatches] = useState(0);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [raffles, setRaffles] = useState<WeeklyRaffle[]>([]);
  const [showEarlyBird, setShowEarlyBird] = useState(false);
  const [earlyBirdMode, setEarlyBirdMode] = useState<"claim" | "confirmed">("confirmed");
  const [selectedRaffle, setSelectedRaffle] = useState<WeeklyRaffle | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await apiFetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        if (meData.user.earlyBirdEligible && !meData.user.earlyBirdGranted) {
          // Eligible but not yet claimed — show every visit until claimed
          setEarlyBirdMode("claim");
          setShowEarlyBird(true);
        } else if (meData.user.earlyBirdGranted) {
          // Already granted — show confirmation once
          const shownKey = `earlyBirdShown_${meData.user.id}`;
          if (!localStorage.getItem(shownKey)) {
            setEarlyBirdMode("confirmed");
            setShowEarlyBird(true);
            localStorage.setItem(shownKey, "1");
          }
        }

        const [rankRes, predRes, fixRes, redRes, raffleRes] = await Promise.all([
          fetch("/api/public/ranking"),
          apiFetch("/api/participant/predictions"),
          fetch("/api/public/fixture"),
          apiFetch("/api/participant/redemptions"),
          fetch("/api/public/raffles"),
        ]);

        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const pos = (rankData.ranking as RankingUser[]).findIndex(
            (r) => r.firstName === meData.user.firstName && r.lastName === meData.user.lastName
          );
          if (pos !== -1) setUserPosition(pos + 1);
        }
        if (predRes.ok) {
          const predData = await predRes.json();
          setPredictedMatches(predData.predictions?.length || 0);
        }
        if (fixRes.ok) {
          const fixData = await fixRes.json();
          // Only count GROUP_STAGE matches (the only phase where predictions can be made)
          const total = (fixData.fixture || [])
            .filter((f: { phase: string; matches: FixtureMatch[] }) => f.phase === "GROUP_STAGE")
            .reduce((sum: number, f: { phase: string; matches: FixtureMatch[] }) => sum + f.matches.length, 0);
          setTotalMatches(total);
        }
        if (redRes.ok) {
          const redData = await redRes.json();
          setRedemptions(redData.redemptions || []);
        }
        if (raffleRes.ok) {
          const raffleData = await raffleRes.json();
          setRaffles(raffleData.raffles || []);
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) return <LoadingScreen text="Cargando tu dashboard..." />;
  if (!user) return null;

  const progressPct = totalMatches > 0 ? Math.round((predictedMatches / totalMatches) * 100) : 0;

  const now = new Date();
  const upcomingRaffles = raffles.filter((r) => {
    if (r.status === "completed" || r.status === "cancelled") return false;
    const date = new Date(r.scheduledAt);
    // Show as upcoming if within 2 hours past or still in future
    return date.getTime() > now.getTime() - 2 * 60 * 60 * 1000;
  });
  const pastRaffles = raffles.filter((r) => {
    if (r.status === "completed" || r.status === "cancelled") return true;
    const date = new Date(r.scheduledAt);
    return date.getTime() <= now.getTime() - 2 * 60 * 60 * 1000;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between gap-4 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Bienvenido de vuelta</p>
              <h1 className="text-xl sm:text-2xl font-black uppercase text-white leading-tight">
                {user.firstName} {user.lastName}
              </h1>
            </div>
          </div>
          {userPosition && (
            <div className="hidden sm:flex flex-col items-center bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
              <span className="text-yellow-400 font-black text-xl">#{userPosition}</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Ranking</span>
            </div>
          )}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <Trophy className="w-4 h-4" />, value: user.totalPoints.toLocaleString(), label: "Puntos totales", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", delay: 0.1 },
            { icon: <TrendingUp className="w-4 h-4" />, value: userPosition ? `#${userPosition}` : "—", label: "En el ranking", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", delay: 0.15 },
            { icon: <Target className="w-4 h-4" />, value: `${predictedMatches}/${totalMatches || "?"}`, label: "Predicciones", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", delay: 0.2 },
            { icon: <Star className="w-4 h-4" />, value: user.bonusPoints.toLocaleString(), label: "Pts bonus", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", delay: 0.25 },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}>
              <Card className={`p-4 border ${s.bg}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${s.color}`}>{s.icon}<span className="text-[10px] uppercase tracking-wider font-bold">{s.label}</span></div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                Predicciones completadas
              </span>
              <span className="text-sm text-red-400 font-bold">
                {predictedMatches} / {totalMatches || "?"} partidos
              </span>
            </div>
            <div className="h-3 bg-[#222] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div className="text-right mt-1 text-xs text-gray-600">{progressPct}%</div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left col: action cards + album */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Acciones rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {actionCards.map((card, i) => (
                <motion.div
                  key={card.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                >
                  <Link href={card.href}>
                    <div className={`border rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${card.bg}`}>
                      <div className={`mb-3 ${card.color}`}>{card.icon}</div>
                      <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-1">{card.title}</h3>
                      <p className="text-gray-500 text-xs">{card.description}</p>
                      <div className={`flex items-center gap-1 text-xs font-semibold mt-3 ${card.color}`}>
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + actionCards.length * 0.07 }}>
                <button
                  type="button"
                  onClick={() => setAlbumModalOpen(true)}
                  className="w-full h-full text-left border rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer bg-amber-600/10 border-amber-600/25"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="text-amber-400"><BookOpen className="w-6 h-6" /></div>
                    <Badge variant="info" className="text-[9px]">Para vos</Badge>
                  </div>
                  <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-1">Álbum virtual</h3>
                  <p className="text-gray-500 text-xs">Tu álbum al día: qué tenés, qué falta y con quién cambiar</p>
                  <div className="flex items-center gap-1 text-xs font-semibold mt-3 text-amber-400">
                    Ver más <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              </motion.div>
            </div>
          </div>

          {/* Right col: sorteos */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Sorteos semanales</h2>
            <div className="space-y-3">
              {raffles.length === 0 && (
                <Card className="p-6 text-center">
                  <Shuffle className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Sin sorteos configurados todavía.</p>
                </Card>
              )}

              {upcomingRaffles.map((r) => {
                const ds = getRaffleDisplayStatus(r);
                const isLive = ds.label.includes("EN VIVO") || ds.label.includes("Es hoy");
                return (
                  <button key={r.id} onClick={() => setSelectedRaffle(r)} className="w-full text-left">
                    <Card className={`p-4 transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer ${isLive ? "border-amber-500/40 bg-amber-950/10" : ""}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-white font-bold text-sm leading-tight">{r.title}</h3>
                        <Badge variant={ds.variant} className="flex-shrink-0 text-[10px]">{ds.label}</Badge>
                      </div>
                      <p className="text-red-400 text-xs font-semibold mb-2">🎁 {r.prize}</p>
                      {r.description && <p className="text-gray-500 text-xs mb-2 line-clamp-2">{r.description}</p>}
                      <div className="flex items-center gap-1 text-gray-600 text-xs">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {new Date(r.scheduledAt).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </Card>
                  </button>
                );
              })}

              {/* Early bird entry notice */}
              {user.earlyBirdGranted && upcomingRaffles.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  🎟️ Tenés +1 entrada extra en todos los sorteos (Early Bird)
                </div>
              )}

              {pastRaffles.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 mt-4">Anteriores</p>
                  {pastRaffles.slice(0, 3).map((r) => (
                    <button key={r.id} onClick={() => setSelectedRaffle(r)} className="w-full text-left">
                      <Card className="p-4 mb-2 opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-gray-300 font-semibold text-sm">{r.title}</h3>
                          <Badge variant="default" className="flex-shrink-0 text-[10px]">Realizado</Badge>
                        </div>
                        <p className="text-gray-600 text-xs mb-1">{r.prize}</p>
                        {r.winnerName && (
                          <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                            <Trophy className="w-3 h-3" />
                            {r.winnerName}
                            {r.winnerInstagram && <span className="text-gray-500 font-normal">(@{r.winnerInstagram})</span>}
                          </div>
                        )}
                      </Card>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premios canjeados */}
        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Mis premios canjeados</h2>
            <Link href="/prizes" className="text-xs text-red-400 hover:text-red-300 font-semibold">
              Canjeá más →
            </Link>
          </div>
          <div className="space-y-2">
            {/* Raffle entries — single row with total count */}
            {(() => {
              const raffleCount = redemptions.filter(r => r.prize.prizeType === "raffle").length;
              const total = 1 + (user.earlyBirdGranted ? 1 : 0) + raffleCount;
              const parts: string[] = ["1 base"];
              if (user.earlyBirdGranted) parts.push("1 Early Bird");
              if (raffleCount > 0) parts.push(`${raffleCount} canjeada${raffleCount > 1 ? "s" : ""}`);
              return (
                <Card className="p-4 flex items-center gap-4 border-amber-500/20 bg-amber-950/10">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">Participación en sorteos semanales</p>
                    <p className="text-gray-500 text-xs">{parts.join(" + ")}</p>
                  </div>
                  <Badge variant={total > 1 ? "warning" : "default"} className="text-sm font-black px-3 py-1">
                    {total} {total === 1 ? "ENTRADA" : "ENTRADAS"}
                  </Badge>
                </Card>
              );
            })()}

            {/* Physical prize redemptions */}
            {redemptions.filter(r => r.prize.prizeType !== "raffle").length === 0 ? (
              <Card className="p-6 flex items-center gap-4">
                <Package className="w-8 h-8 text-gray-700 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-sm font-semibold">Todavía no canjeaste ningún premio físico</p>
                  <p className="text-gray-600 text-xs mt-0.5">Acumulá puntos y canjeá productos gaming exclusivos.</p>
                </div>
                <Link href="/prizes" className="ml-auto flex-shrink-0">
                  <Button variant="primary" size="sm">Ver premios</Button>
                </Link>
              </Card>
            ) : (
              redemptions.filter(r => r.prize.prizeType !== "raffle").map((red) => {
                const st = REDEMPTION_STATUS[red.status] ?? { label: red.status, icon: null };
                return (
                  <Card key={red.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-600/30 flex items-center justify-center flex-shrink-0">
                      {red.prize.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={red.prize.imageUrl} alt={red.prize.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Gift className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold line-clamp-1">{red.prize.name}</p>
                      <p className="text-gray-600 text-xs">
                        {new Date(red.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-red-400 font-black text-sm">-{red.pointsSpent} pts</span>
                      <Badge variant={red.status === "delivered" ? "success" : red.status === "rejected" ? "error" : "warning"}>
                        <span className="flex items-center gap-1">{st.icon}{st.label}</span>
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Sponsor CTA */}
        <div className="mb-6">
          <SponsorCTA compact />
        </div>

        {/* Points breakdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Desglose de puntos</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-blue-400">{user.predictionPoints}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Predicciones</div>
              </div>
              <div>
                <div className="text-xl font-black text-green-400">{user.bonusPoints}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Bonus</div>
              </div>
              <div>
                <div className="text-xl font-black text-red-400">{user.spentPoints}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Canjeados</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <Footer />

      <VirtualAlbumModal open={albumModalOpen} onClose={() => setAlbumModalOpen(false)} />
      {showEarlyBird && (
        <EarlyBirdModal
          mode={earlyBirdMode}
          onClose={() => setShowEarlyBird(false)}
          onClaimed={() => {
            setUser(u => u ? { ...u, earlyBirdGranted: true, earlyBirdEligible: false } : u);
          }}
        />
      )}

      {/* Raffle detail modal */}
      {selectedRaffle && (
        <>
          <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={() => setSelectedRaffle(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Sorteo</p>
                  <h2 className="text-white font-black text-lg leading-tight">{selectedRaffle.title}</h2>
                </div>
                <button onClick={() => setSelectedRaffle(null)} className="text-gray-600 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {(() => {
                  const ds = getRaffleDisplayStatus(selectedRaffle);
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">Estado:</span>
                      <Badge variant={ds.variant} className="text-[10px]">{ds.label}</Badge>
                    </div>
                  );
                })()}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#222]">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Premio</p>
                  <p className="text-red-400 font-bold text-sm">🎁 {selectedRaffle.prize}</p>
                </div>
                {selectedRaffle.description && (
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#222]">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Descripción</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{selectedRaffle.description}</p>
                  </div>
                )}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#222]">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Fecha del sorteo</p>
                  <p className="text-white text-sm font-semibold">
                    {new Date(selectedRaffle.scheduledAt).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {user.earlyBirdGranted && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                    🎟️ Tenés +1 entrada por Early Bird en este sorteo
                  </div>
                )}
                {selectedRaffle.winnerName && (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                    <Trophy className="w-4 h-4" />
                    Ganador: {selectedRaffle.winnerName}
                    {selectedRaffle.winnerInstagram && <span className="text-gray-500 font-normal">(@{selectedRaffle.winnerInstagram})</span>}
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedRaffle(null)} className="mt-5 w-full py-2.5 text-gray-500 hover:text-gray-300 font-semibold text-sm transition-colors">
                Cerrar
              </button>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
