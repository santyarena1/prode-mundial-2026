"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Target, Star, Gift, Zap, ChevronRight, User, TrendingUp, CheckCircle2, BookOpen,
  Clock, Shuffle, Package, XCircle,
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
  prize: { name: string; imageUrl?: string | null };
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

const RAFFLE_STATUS: Record<string, { label: string; variant: "info" | "warning" | "success" | "error" | "default" }> = {
  upcoming: { label: "Próximo", variant: "info" },
  live: { label: "EN VIVO", variant: "warning" },
  completed: { label: "Realizado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "error" },
};

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
    title: "Canjear premios",
    description: "Tus puntos por productos gaming",
    color: "text-purple-400",
    bg: "bg-purple-600/10 border-purple-600/20",
  },
  {
    href: "/bonuses",
    icon: <Zap className="w-6 h-6" />,
    title: "Ganar bonus",
    description: "Código de compra y acciones bonus",
    color: "text-green-400",
    bg: "bg-green-600/10 border-green-600/20",
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

        // Show early bird modal once
        if (meData.user.earlyBirdGranted) {
          const key = `earlyBirdShown_${meData.user.id}`;
          if (!localStorage.getItem(key)) {
            setShowEarlyBird(true);
            localStorage.setItem(key, "1");
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
          const total = (fixData.fixture || []).reduce(
            (sum: number, f: { matches: FixtureMatch[] }) => sum + f.matches.length,
            0
          );
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
  const upcomingRaffles = raffles.filter((r) => r.status === "upcoming" || r.status === "live");
  const pastRaffles = raffles.filter((r) => r.status === "completed" || r.status === "cancelled");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider">Bienvenido de vuelta</p>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-white">
              Hola, {user.firstName}!
            </h1>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Trophy className="w-5 h-5 text-yellow-400" />, value: user.totalPoints, label: "Puntos totales", color: "text-yellow-400", delay: 0.1 },
            { icon: <TrendingUp className="w-5 h-5 text-red-400" />, value: userPosition ? `#${userPosition}` : "-", label: "Posición ranking", color: "text-red-400", delay: 0.15 },
            { icon: <Target className="w-5 h-5 text-blue-400" />, value: predictedMatches, label: "Predicciones", color: "text-blue-400", delay: 0.2 },
            { icon: <Star className="w-5 h-5 text-green-400" />, value: user.bonusPoints, label: "Bonus pts", color: "text-green-400", delay: 0.25 },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}>
              <Card className="p-5 text-center">
                <div className="mx-auto mb-2 w-5 h-5">{s.icon}</div>
                <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{s.label}</div>
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

              {upcomingRaffles.map((r) => (
                <Card key={r.id} className={`p-4 ${r.status === "live" ? "border-amber-500/40 bg-amber-950/10" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-bold text-sm leading-tight">{r.title}</h3>
                    <Badge variant={RAFFLE_STATUS[r.status]?.variant ?? "default"} className="flex-shrink-0 text-[10px]">
                      {RAFFLE_STATUS[r.status]?.label ?? r.status}
                    </Badge>
                  </div>
                  <p className="text-red-400 text-xs font-semibold mb-2">🎁 {r.prize}</p>
                  {r.description && <p className="text-gray-500 text-xs mb-2">{r.description}</p>}
                  <div className="flex items-center gap-1 text-gray-600 text-xs">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {new Date(r.scheduledAt).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </Card>
              ))}

              {pastRaffles.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 mt-4">Anteriores</p>
                  {pastRaffles.slice(0, 3).map((r) => (
                    <Card key={r.id} className="p-4 mb-2 opacity-75">
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
              Canjear más →
            </Link>
          </div>
          {redemptions.length === 0 ? (
            <Card className="p-6 flex items-center gap-4">
              <Package className="w-8 h-8 text-gray-700 flex-shrink-0" />
              <div>
                <p className="text-gray-400 text-sm font-semibold">Todavía no canjeaste ningún premio</p>
                <p className="text-gray-600 text-xs mt-0.5">Acumulá puntos y canjeá productos gaming exclusivos.</p>
              </div>
              <Link href="/prizes" className="ml-auto flex-shrink-0">
                <Button variant="primary" size="sm">Ver premios</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {redemptions.map((red) => {
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
              })}
            </div>
          )}
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
      {showEarlyBird && <EarlyBirdModal onClose={() => setShowEarlyBird(false)} />}
    </div>
  );
}
