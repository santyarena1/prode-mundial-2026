"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Star, ChevronRight, Users, Target, Zap, Gift, Medal, Radio } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Logo } from "@/components/layout/Logo";
import { HeroSponsors } from "@/components/home/HeroSponsors";
import { HeroVideo } from "@/components/home/HeroVideo";
import { WelcomeModal } from "@/components/home/WelcomeModal";
import { SponsorCTA } from "@/components/home/SponsorCTA";
import { AnimatePresence } from "framer-motion";

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

interface Stats {
  totalParticipants: number;
  totalPredictions: number;
  topScore: number;
}

interface RankingUser {
  position: number;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

interface FeaturedPrize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  requiredPoints: number;
  prizeType: string;
  sponsor?: { id: string; name: string; logoUrl?: string | null } | null;
}

const PRIZE_TYPE_TAG: Record<string, string> = {
  raffle: "SORTEO",
  jackpot: "JACKPOT",
  ranking: "RANKING",
  digital: "DIGITAL",
  coupon: "CUPÓN",
  physical: "FÍSICO",
};

const steps = [
  {
    icon: <Users className="w-8 h-8" />,
    number: "01",
    title: "Registrate",
    description: "Creá tu cuenta gratis y unite al prode gamer más grande del mundial.",
  },
  {
    icon: <Target className="w-8 h-8" />,
    number: "02",
    title: "Cargá tus predicciones",
    description: "Predecí los resultados de los partidos de la fase de grupos y del bracket.",
  },
  {
    icon: <Zap className="w-8 h-8" />,
    number: "03",
    title: "Acumulá puntos",
    description: "Acertá predicciones, códigos en historias de Instagram, en el local o con tu compra.",
  },
  {
    icon: <Gift className="w-8 h-8" />,
    number: "04",
    title: "Ganá premios",
    description: "Canjeá tus puntos por productos gaming exclusivos de The Gamer Shop.",
  },
];

const positionBadgeVariant = (pos: number): "gold" | "silver" | "bronze" | "position" => {
  if (pos === 1) return "gold";
  if (pos === 2) return "silver";
  if (pos === 3) return "bronze";
  return "position";
};

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [featuredPrizes, setFeaturedPrizes] = useState<FeaturedPrize[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, rankingRes, sponsorsRes, prizesRes, meRes] = await Promise.all([
          fetch("/api/public/stats"),
          fetch("/api/public/ranking"),
          fetch("/api/public/sponsors"),
          fetch("/api/public/prizes/featured"),
          fetch("/api/auth/me"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (rankingRes.ok) {
          const data = await rankingRes.json();
          setRanking((data.ranking || []).slice(0, 5));
        }
        if (sponsorsRes.ok) {
          const data = await sponsorsRes.json();
          setSponsors(data.sponsors || []);
        }
        if (prizesRes.ok) {
          const data = await prizesRes.json();
          setFeaturedPrizes(data.prizes || []);
        }
        if (meRes.ok) setIsLoggedIn(true);
      } catch {
        // ignore
      } finally {
        setLoadingStats(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* HERO — una pantalla completa */}
      <section className="relative h-[100dvh] min-h-[520px] max-h-[100dvh] overflow-hidden flex flex-col">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-red-950/10 mix-blend-multiply" />

        <div className="relative z-10 flex flex-1 flex-col justify-center w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-[4.5rem] pb-6 sm:pb-8 hero-content">
          <div className="flex flex-col items-center text-center w-full">
            {/* Logo — siempre arriba, centrado */}
            <motion.div
              className="flex flex-col items-center shrink-0 mb-2 sm:mb-3"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Logo size="hero" variant="hero" href={undefined} priority />
              <HeroSponsors sponsors={sponsors} />
            </motion.div>

            {/* Copy + acciones */}
            <div className="flex flex-col items-center text-center w-full max-w-xl lg:max-w-2xl">
              <motion.span
                className="inline-block bg-black/45 backdrop-blur-sm border border-white/15 text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 sm:mb-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                Copa del Mundo 2026
              </motion.span>

              <motion.h1
                className="text-[1.75rem] leading-none sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-5xl font-black uppercase drop-shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <span className="text-white">Armá tu </span>
                <span className="text-white">prode </span>
                <span className="neon-red">albiceleste</span>
              </motion.h1>

              <motion.div
                className="mt-2 sm:mt-3 mb-4 sm:mb-5 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <p className="text-gray-200/95 text-xs sm:text-sm md:text-base leading-snug sm:leading-relaxed drop-shadow-lg">
                  Predecí, sumá puntos y canjeá premios con{" "}
                  <span className="text-white font-semibold">The Gamer Shop</span>
                </p>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center w-full sm:w-auto mb-4 sm:mb-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {isLoggedIn ? (
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button variant="primary" size="lg" className="animate-glow w-full sm:min-w-[180px]">
                      IR AL DASHBOARD
                    </Button>
                  </Link>
                ) : (
                  <button onClick={() => setShowWelcome(true)} className="w-full sm:w-auto">
                    <Button variant="primary" size="lg" className="animate-glow w-full sm:min-w-[180px]">
                      SUMATE AHORA
                    </Button>
                  </button>
                )}
                <Link href="/fixture-live" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:min-w-[160px] bg-black/35 backdrop-blur-sm border-red-500/40 hover:border-red-500/60 hover:bg-red-950/30 text-white"
                  >
                    <Radio className="w-4 h-4" />
                    FIXTURE LIVE
                  </Button>
                </Link>
                <Link href="/ranking" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:min-w-[140px] bg-black/35 backdrop-blur-sm border-white/25 hover:bg-black/55 text-white"
                  >
                    VER RANKING
                  </Button>
                </Link>
              </motion.div>

              {!loadingStats && stats && (
                <motion.div
                  className="inline-flex flex-wrap justify-center items-center gap-x-4 gap-y-2 sm:gap-x-6 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-4 py-2.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  {[
                    { value: stats.totalParticipants, label: "Participantes" },
                    { value: stats.totalPredictions, label: "Predicciones" },
                    { value: stats.topScore, label: "Top puntos" },
                  ].map((stat, i) => (
                    <div key={stat.label} className="flex items-center gap-4 sm:gap-6">
                      {i > 0 && <div className="w-px h-7 bg-white/15 shrink-0" />}
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black text-red-500 leading-none tabular-nums">
                          {stat.value.toLocaleString()}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mt-0.5">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
              {loadingStats && <LoadingSpinner size="sm" className="mx-auto" />}
            </div>
          </div>
        </div>

        <p
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5 z-[5] text-[9px] sm:text-[10px] text-white/25 tracking-wide pointer-events-none select-none"
          aria-label="Crédito del video"
        >
          Video © TyC Sports
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
            ¿Cómo funciona?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mt-2">
            4 PASOS PARA GANAR
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 h-full hover:border-red-600/30 transition-colors">
                <div className="text-5xl font-black text-red-600/20 mb-3">{step.number}</div>
                <div className="text-red-500 mb-3">{step.icon}</div>
                <h3 className="text-white font-bold uppercase tracking-wider mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRIZES PREVIEW */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
              Premios
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mt-2">
              CANJEÁ TUS PUNTOS
            </h2>
            <p className="text-gray-500 mt-2">Productos gaming exclusivos te esperan</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {featuredPrizes.map((prize, i) => (
              <motion.div
                key={prize.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href="/prizes">
                  <div className="glow-border rounded-xl p-6 bg-[#111] hover:bg-[#151515] transition-colors cursor-pointer h-full">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-red-600/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded">
                        {PRIZE_TYPE_TAG[prize.prizeType] ?? "PREMIO"}
                      </span>
                      <Gift className="w-5 h-5 text-red-500/50" />
                    </div>
                    <div className="relative w-full aspect-[5/2] rounded-lg mb-4 overflow-hidden bg-[#1a1a1a]">
                      {prize.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🎁</span></div>
                      )}
                      {prize.sponsor?.logoUrl && (
                        <div className="absolute bottom-0 right-0 pointer-events-none">
                          <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/75 via-black/30 to-transparent rounded-tl-xl" />
                          <div className="absolute bottom-1.5 right-1.5 w-7 h-7 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={prize.sponsor.logoUrl} alt={prize.sponsor.name} className="max-w-full max-h-full object-contain drop-shadow-lg" />
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="text-white font-bold mb-1 line-clamp-2">{prize.name}</h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{prize.description}</p>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span className="font-bold">{prize.requiredPoints.toLocaleString()} puntos</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            {featuredPrizes.length === 0 && [0, 1, 2].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glow-border rounded-xl p-6 bg-[#111] h-full flex flex-col items-center justify-center min-h-[200px]">
                  <Gift className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="text-gray-600 text-sm">Premio por definir</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/prizes">
              <Button variant="outline" size="lg">
                Ver todos los premios <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* RANKING PREVIEW */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
            Competencia
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white mt-2">
            TOP JUGADORES
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {ranking.length === 0 && !loadingStats && (
            <Card className="p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">¡El ranking aún está vacío. Sé el primero!</p>
            </Card>
          )}

          {ranking.map((user, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 p-4 border-b border-[#1a1a1a] hover:bg-[#111] transition-colors rounded-xl mb-1"
            >
              <Badge variant={positionBadgeVariant(user.position)} className="w-10 h-8 flex items-center justify-center text-sm">
                #{user.position}
              </Badge>
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-sm font-bold text-gray-300">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">{user.firstName} <span className="blur-sm select-none">{user.lastName}</span></div>
              </div>
              <div className="flex items-center gap-1 text-yellow-400 font-black">
                <Medal className="w-4 h-4" />
                {user.totalPoints}
              </div>
            </motion.div>
          ))}

          {ranking.length > 0 && (
            <div className="text-center mt-6">
              <Link href="/ranking">
                <Button variant="secondary" size="md">
                  Ver ranking completo <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SPONSOR CTA */}
      <SponsorCTA totalParticipants={stats?.totalParticipants} />

      <Footer />

      <AnimatePresence>
        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      </AnimatePresence>
    </div>
  );
}
