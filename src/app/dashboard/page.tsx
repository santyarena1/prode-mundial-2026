"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Target, Star, Gift, Zap, ChevronRight, User, TrendingUp, CheckCircle2, BookOpen, UserCircle,
} from "lucide-react";
import { VirtualAlbumModal } from "@/components/dashboard/VirtualAlbumModal";
import { SponsorCTA } from "@/components/home/SponsorCTA";
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

const actionCards = [
  {
    href: "/perfil",
    icon: <UserCircle className="w-6 h-6" />,
    title: "Mi perfil",
    description: "Tus datos, contraseña y cómo recuperar la cuenta",
    color: "text-cyan-400",
    bg: "bg-cyan-600/10 border-cyan-600/20",
  },
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

        // Fetch ranking for position
        const rankRes = await fetch("/api/public/ranking");
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const pos = (rankData.ranking as RankingUser[]).findIndex(
            (r) => r.firstName === meData.user.firstName && r.lastName === meData.user.lastName
          );
          if (pos !== -1) setUserPosition(pos + 1);
        }

        // Fetch predictions count
        const predRes = await apiFetch("/api/participant/predictions");
        if (predRes.ok) {
          const predData = await predRes.json();
          setPredictedMatches(predData.predictions?.length || 0);
        }

        // Total matches
        const fixRes = await fetch("/api/public/fixture");
        if (fixRes.ok) {
          const fixData = await fixRes.json();
          const total = (fixData.fixture || []).reduce(
            (sum: number, f: { matches: FixtureMatch[] }) => sum + f.matches.length,
            0
          );
          setTotalMatches(total);
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-yellow-400">{user.totalPoints}</div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Puntos totales</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-5 text-center">
              <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-red-400">
                {userPosition ? `#${userPosition}` : "-"}
              </div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Posición ranking</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-blue-400">{predictedMatches}</div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Predicciones</div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-5 text-center">
              <Star className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-green-400">{user.bonusPoints}</div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">Bonus pts</div>
            </Card>
          </motion.div>
        </div>

        {/* Progress bar */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
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

        {/* Action cards */}
        <div className="mb-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-gray-300 mb-4">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-1">
                      {card.title}
                    </h3>
                    <p className="text-gray-500 text-xs">{card.description}</p>
                    <div className={`flex items-center gap-1 text-xs font-semibold mt-3 ${card.color}`}>
                      Ir ahora <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + actionCards.length * 0.07 }}
            >
              <button
                type="button"
                onClick={() => setAlbumModalOpen(true)}
                className="w-full text-left border rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer bg-amber-600/10 border-amber-600/25"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="text-amber-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <Badge variant="info" className="text-[9px]">
                    Para vos
                  </Badge>
                </div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-1">
                  Álbum virtual
                </h3>
                <p className="text-gray-500 text-xs">
                  Tu álbum al día: qué tenés, qué falta y con quién cambiar
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold mt-3 text-amber-400">
                  Ver más <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            </motion.div>
          </div>
        </div>

        {/* Sponsor CTA */}
        <div className="mb-6">
          <SponsorCTA compact />
        </div>

        {/* Points breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
              Desglose de puntos
            </h3>
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
    </div>
  );
}
