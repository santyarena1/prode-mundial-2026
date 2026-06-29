"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Target, Star, Gift, Zap, ChevronRight, User, TrendingUp, CheckCircle2, BookOpen,
  Clock, Shuffle, Package, XCircle, Users, X, Ticket, MessageCircle, Copy,
} from "lucide-react";
import { VirtualAlbumModal } from "@/components/dashboard/VirtualAlbumModal";
import { BracketModeModal } from "@/components/dashboard/BracketModeModal";
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
  bracketMode?: string | null;
  officialFromPhase?: string | null;
}

interface RankingUser {
  position: number;
  id: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

interface NextMatch {
  id: string;
  phase: string;
  status: string;
  startDate: string;
  homeTeam?: { name: string; code: string; flagUrl?: string };
  awayTeam?: { name: string; code: string; flagUrl?: string };
  homePlaceholder?: string;
  awayPlaceholder?: string;
  group?: { name: string };
}

interface DashboardPrediction {
  id: string;
  predictedOutcome?: string;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  pointsEarned: number;
  match: {
    status: string;
    realOutcome?: string;
    homeScore?: number;
    awayScore?: number;
    homeTeam?: { name: string; code: string; flagUrl?: string };
    awayTeam?: { name: string; code: string; flagUrl?: string };
    homePlaceholder?: string;
    awayPlaceholder?: string;
    startDate?: string;
    phase: string;
  };
}

interface Redemption {
  id: string;
  status: string;
  pointsSpent: number;
  createdAt: string;
  prize: { name: string; imageUrl?: string | null; prizeType: string };
}

interface SponsorBannerItem {
  imageUrl: string;
  linkUrl: string;
  visible: boolean;
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
  const [dashboardBanners, setDashboardBanners] = useState<SponsorBannerItem[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [countdown, setCountdown] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [pendingGroupCount, setPendingGroupCount] = useState(0);
  const [recentResults, setRecentResults] = useState<DashboardPrediction[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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

        // Si el usuario todavía no eligió modo de llaves, el modal de modo tiene
        // prioridad: no mostramos el de early bird/sorteo encima.
        const modeChosen = meData.user.bracketMode != null;

        if (modeChosen) {
          if (meData.user.earlyBirdEligible && !meData.user.earlyBirdGranted) {
            // Eligible but not yet claimed — show every visit until claimed
            setEarlyBirdMode("claim");
            setShowEarlyBird(true);
          } else {
            // Show welcome raffle modal once for all registered users
            const shownKey = `raffleWelcomeShown_${meData.user.id}`;
            if (!localStorage.getItem(shownKey)) {
              setEarlyBirdMode("confirmed");
              setShowEarlyBird(true);
              localStorage.setItem(shownKey, "1");
            }
          }
        }

        const [rankRes, predRes, bracketPredRes, redRes, raffleRes, bannerRes, fixtureRes, refRes] = await Promise.all([
          fetch("/api/public/ranking"),
          apiFetch("/api/participant/predictions"),
          apiFetch("/api/participant/bracket-predictions"),
          apiFetch("/api/participant/redemptions"),
          fetch("/api/public/raffles"),
          fetch("/api/public/sponsor-banners"),
          fetch("/api/public/fixture"),
          apiFetch("/api/participant/referral"),
        ]);

        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const me = (rankData.ranking as RankingUser[]).find((r) => r.id === meData.user.id);
          if (me) setUserPosition(me.position);
        }

        if (refRes.ok) {
          const refData = await refRes.json();
          setReferralCode(refData.referralCode ?? null);
        }

        // 72 group + 31 bracket slots (16+8+4+2+1)
        setTotalMatches(103);
        if (predRes.ok) {
          const preds: DashboardPrediction[] = (await predRes.json()).predictions || [];
          const bracketCount = bracketPredRes.ok
            ? ((await bracketPredRes.json()).bracketPredictions || []).length
            : 0;
          setPredictedMatches(preds.length + bracketCount);

          const effectiveOutcome = (p: DashboardPrediction) => {
            if (p.predictedHomeScore != null && p.predictedAwayScore != null) {
              return p.predictedHomeScore > p.predictedAwayScore ? "home"
                : p.predictedAwayScore > p.predictedHomeScore ? "away" : "draw";
            }
            return p.predictedOutcome ?? null;
          };
          const matchOutcome = (p: DashboardPrediction) => {
            if (p.match.realOutcome) return p.match.realOutcome;
            if (p.match.homeScore != null && p.match.awayScore != null) {
              return p.match.homeScore > p.match.awayScore ? "home"
                : p.match.awayScore > p.match.homeScore ? "away" : "draw";
            }
            return null;
          };

          const finishedPreds = preds.filter(
            (p) => p.match.status === "finished" && matchOutcome(p) !== null
          );
          // Require both outcomes to be non-null before classifying
          const correctPreds = finishedPreds.filter((p) => {
            const eo = effectiveOutcome(p); const mo = matchOutcome(p);
            return eo !== null && mo !== null && eo === mo;
          });
          const wrongPreds = finishedPreds.filter((p) => {
            const eo = effectiveOutcome(p); const mo = matchOutcome(p);
            return eo !== null && mo !== null && eo !== mo;
          });
          setCorrectCount(correctPreds.length);
          setWrongCount(wrongPreds.length);
          // pendientes = group predictions for matches not yet finished
          const pendingGroup = preds.filter(
            (p) => p.match.phase === "GROUP_STAGE" && p.match.status !== "finished"
          ).length;
          setPendingGroupCount(pendingGroup);
          setRecentResults(finishedPreds.slice(-3).reverse());
        }

        if (fixtureRes.ok) {
          const { fixture } = await fixtureRes.json();
          const nowTime = new Date();
          const allMatches = (fixture as any[]).flatMap((p: any) => p.matches);
          const upcoming = allMatches
            .filter((m: any) => m.status !== "finished" && m.startDate)
            .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          const next = upcoming.find((m: any) => new Date(m.startDate).getTime() > nowTime.getTime() - 2 * 60 * 60 * 1000);
          if (next) setNextMatch(next);
        }

        if (redRes.ok) {
          const redData = await redRes.json();
          setRedemptions(redData.redemptions || []);
        }
        if (raffleRes.ok) {
          const raffleData = await raffleRes.json();
          setRaffles(raffleData.raffles || []);
        }
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          const visible = (bannerData.dashboard?.banners ?? []).filter(
            (b: SponsorBannerItem) => b.visible && b.imageUrl
          );
          setDashboardBanners(visible);
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (dashboardBanners.length <= 1) return;
    const id = setInterval(() => setBannerIndex(i => (i + 1) % dashboardBanners.length), 5000);
    return () => clearInterval(id);
  }, [dashboardBanners.length]);

  useEffect(() => {
    if (!nextMatch) return;
    const tick = () => {
      if (nextMatch.status === "live") {
        setCountdown("live");
        return;
      }
      const diff = new Date(nextMatch.startDate).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("live");
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (days > 0) {
        setCountdown(`${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
      } else {
        setCountdown(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextMatch]);

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

        {/* Sponsor banners carousel */}
        {dashboardBanners.length > 0 && (
          <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
            {(() => {
              const banner = dashboardBanners[bannerIndex];
              const inner = (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={banner.imageUrl} alt="Sponsor" className="w-full h-auto block" />
              );
              return banner.linkUrl ? (
                <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl overflow-hidden border border-[#222]">
                  {inner}
                </a>
              ) : (
                <div className="w-full rounded-xl overflow-hidden border border-[#222]">{inner}</div>
              );
            })()}
            {dashboardBanners.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {dashboardBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === bannerIndex ? "bg-white" : "bg-[#444]"}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <Trophy className="w-4 h-4" />, value: user.totalPoints.toLocaleString(), label: "Puntos totales", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", delay: 0.1 },
            { icon: <TrendingUp className="w-4 h-4" />, value: userPosition ? `#${userPosition}` : "—", label: "En el ranking", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", delay: 0.15 },
            { icon: <Target className="w-4 h-4" />, value: `${predictedMatches}/${totalMatches}`, label: "Predicciones", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", delay: 0.2 },
            { icon: <Gift className="w-4 h-4" />, value: (user.totalPoints - user.spentPoints).toLocaleString(), label: "Pts disponibles", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", delay: 0.25 },
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
                {predictedMatches} / {totalMatches}
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

        {/* Próximo partido countdown — compact single row */}
        {nextMatch && (
          <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className={`bg-[#0d0d0d] border rounded-xl px-4 py-2.5 flex items-center gap-3 ${
              nextMatch.status === "live" || countdown === "live" ? "border-red-600/40" : "border-[#1e1e1e]"
            }`}>
              {/* Label */}
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 flex-shrink-0 hidden sm:block">
                Próximo
              </span>
              <Clock className="w-3 h-3 text-gray-600 flex-shrink-0 sm:hidden" />

              {/* Teams */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                {nextMatch.homeTeam?.flagUrl
                  ? <img src={nextMatch.homeTeam.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                  : <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{nextMatch.homeTeam?.code ?? nextMatch.homePlaceholder ?? "?"}</span>
                }
                <span className="text-white text-xs font-bold shrink min-w-0">
                  {nextMatch.homeTeam?.name ?? nextMatch.homePlaceholder ?? "TBD"}
                </span>
                <span className="text-gray-600 text-[10px] font-black flex-shrink-0">vs</span>
                <span className="text-white text-xs font-bold shrink min-w-0">
                  {nextMatch.awayTeam?.name ?? nextMatch.awayPlaceholder ?? "TBD"}
                </span>
                {nextMatch.awayTeam?.flagUrl
                  ? <img src={nextMatch.awayTeam.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                  : <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{nextMatch.awayTeam?.code ?? nextMatch.awayPlaceholder ?? "?"}</span>
                }
              </div>

              {/* Countdown / LIVE */}
              <div className="flex-shrink-0">
                {countdown === "live" ? (
                  <span className="text-red-500 text-[10px] font-black tracking-widest">🔴 LIVE</span>
                ) : countdown ? (
                  <span className="text-white font-black text-xs tabular-nums tracking-tight">
                    {countdown.split(":").length === 4
                      ? `${countdown.split(":")[0]}d ${countdown.split(":")[1]}h ${countdown.split(":")[2]}m`
                      : `${countdown.split(":")[0]}h ${countdown.split(":")[1]}m ${countdown.split(":")[2]}s`
                    }
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}

        {/* Mis últimos resultados */}
        {correctCount + wrongCount > 0 && (
          <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Mis resultados</h2>
            <Card className="p-5">
              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 bg-green-600/10 border border-green-600/20 rounded-lg px-3 py-1.5">
                  <span className="text-green-400 font-black text-base">{correctCount}</span>
                  <span className="text-green-400/70 text-xs font-semibold uppercase tracking-wider">Acertadas</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-1.5">
                  <span className="text-red-400 font-black text-base">{wrongCount}</span>
                  <span className="text-red-400/70 text-xs font-semibold uppercase tracking-wider">Fallidas</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-600/10 border border-gray-600/20 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400 font-black text-base">{pendingGroupCount}</span>
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Pendientes</span>
                </div>
              </div>

              {/* Last 3 results */}
              {recentResults.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 mb-2">Últimas 3</p>
                  <div className="space-y-2">
                    {recentResults.map((pred) => {
                      const predEff = pred.predictedHomeScore != null && pred.predictedAwayScore != null
                        ? (pred.predictedHomeScore > pred.predictedAwayScore ? "home" : pred.predictedAwayScore > pred.predictedHomeScore ? "away" : "draw")
                        : (pred.predictedOutcome ?? null);
                      const matchEff = pred.match.realOutcome
                        ?? (pred.match.homeScore != null && pred.match.awayScore != null
                          ? (pred.match.homeScore > pred.match.awayScore ? "home" : pred.match.awayScore > pred.match.homeScore ? "away" : "draw")
                          : null);
                      const isCorrect = predEff !== null && matchEff !== null && predEff === matchEff;
                      const home = pred.match.homeTeam?.name ?? pred.match.homePlaceholder ?? "?";
                      const away = pred.match.awayTeam?.name ?? pred.match.awayPlaceholder ?? "?";
                      const homeFlagUrl = pred.match.homeTeam?.flagUrl;
                      const awayFlagUrl = pred.match.awayTeam?.flagUrl;
                      const homeCode = pred.match.homeTeam?.code;
                      const awayCode = pred.match.awayTeam?.code;
                      const score =
                        pred.match.homeScore != null && pred.match.awayScore != null
                          ? `${pred.match.homeScore}-${pred.match.awayScore}`
                          : null;
                      return (
                        <div
                          key={pred.id}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border-l-4 bg-[#111] ${
                            isCorrect ? "border-green-500" : "border-red-500"
                          }`}
                        >
                          {/* Flags */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {homeFlagUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={homeFlagUrl} alt={home} className="w-6 h-4 object-cover rounded-sm" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-500">{homeCode ?? "?"}</span>
                            )}
                            <span className="text-gray-600 text-[10px] mx-0.5">vs</span>
                            {awayFlagUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={awayFlagUrl} alt={away} className="w-6 h-4 object-cover rounded-sm" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-500">{awayCode ?? "?"}</span>
                            )}
                          </div>
                          {/* Names */}
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-xs font-semibold truncate">
                              {home} vs {away}
                            </span>
                            {score && <span className="text-gray-500 text-[10px] ml-1.5">{score}</span>}
                          </div>
                          {/* Result */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isCorrect ? (
                              <>
                                <span className="text-green-400 font-black text-sm">✓</span>
                                {pred.pointsEarned > 0 && (
                                  <span className="text-green-400 text-[10px] font-bold">+{pred.pointsEarned} pts</span>
                                )}
                              </>
                            ) : (
                              <span className="text-red-400 font-black text-sm">✗</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

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
            <Link href="/mis-premios" className="text-xs text-red-400 hover:text-red-300 font-semibold">
              Ver historial →
            </Link>
          </div>
          <div className="space-y-2">
            {/* Raffle entries — only real DB redemptions */}
            {(() => {
              const total = redemptions.filter(r => r.prize.prizeType === "raffle" && r.status !== "rejected" && r.status !== "delivered").length;
              if (total === 0) return null;
              return (
                <Card className="p-4 flex items-center gap-4 border-amber-500/20 bg-amber-950/10">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">Participación en sorteos semanales</p>
                    <p className="text-gray-500 text-xs">{total === 1 ? "1 entrada" : `${total} entradas`}</p>
                  </div>
                  <Badge variant={total > 1 ? "warning" : "default"} className="text-sm font-black px-3 py-1">
                    {total} {total === 1 ? "ENTRADA" : "ENTRADAS"}
                  </Badge>
                </Card>
              );
            })()}

            {/* Physical prize redemptions */}
            {redemptions.filter(r => r.prize.prizeType !== "raffle" && r.status !== "rejected").length === 0 ? (
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
              redemptions.filter(r => r.prize.prizeType !== "raffle" && r.status !== "rejected").map((red) => {
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

        {/* Share with friends */}
        {referralCode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mb-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Invitá amigos</h3>
              </div>
              <p className="text-gray-500 text-xs mb-3">Compartí tu código y los dos ganan puntos extra.</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 font-mono text-white font-black tracking-widest text-base flex-1 text-center">
                  {referralCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 transition-colors font-semibold text-xs flex-shrink-0"
                >
                  {codeCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {codeCopied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `¡Unite al Prode Mundial Gamer 2026! 🏆⚽\n\nRegistrate gratis y competí por premios reales.\n\n👉 https://thegamershop-premios.com/register\n\nUsa mi código al registrarte y los dos ganamos puntos extra:\n🎟️ Código: *${referralCode}*`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors"
                style={{ background: "#25D366", color: "#fff" }}
              >
                <MessageCircle className="w-4 h-4" />
                Compartir por WhatsApp
              </a>
            </Card>
          </motion.div>
        )}

        {/* Points summary */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Resumen de puntos</h3>
              <Link href="/mis-premios" className="text-xs text-red-400 hover:text-red-300 font-semibold">
                Ver historial →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-yellow-400">{user.totalPoints.toLocaleString()}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mt-0.5">Acumulados</div>
              </div>
              <div>
                <div className="text-xl font-black text-red-400">{user.spentPoints.toLocaleString()}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mt-0.5">Canjeados</div>
              </div>
              <div>
                <div className="text-xl font-black text-green-400">{(user.totalPoints - user.spentPoints).toLocaleString()}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider mt-0.5">Disponibles</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <Footer />

      <VirtualAlbumModal open={albumModalOpen} onClose={() => setAlbumModalOpen(false)} />

      {/* Modal forzado: elección de modo de llaves (se muestra hasta que el usuario elige) */}
      {user && (user.bracketMode === null || user.bracketMode === undefined) && (
        <BracketModeModal
          onChosen={(mode, data) => {
            setUser((u) =>
              u ? { ...u, bracketMode: mode, officialFromPhase: data.officialFromPhase ?? null } : u
            );
            if (mode === "OFFICIAL") router.push("/predictions");
          }}
        />
      )}
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
