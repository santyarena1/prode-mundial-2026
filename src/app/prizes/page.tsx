"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Star, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PrizeDetailModal } from "@/components/prizes/PrizeDetailModal";

interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  requiredPoints: number;
  stock: number;
  active: boolean;
  prizeType: string;
  sponsor?: { id: string; name: string; logoUrl?: string | null } | null;
}

interface UserData {
  totalPoints: number;
  firstName: string;
}

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<Record<string, boolean>>({});
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

  useEffect(() => {
    const init = async () => {
      const [meRes, prizesRes] = await Promise.all([
        apiFetch("/api/auth/me"),
        fetch("/api/public/prizes"),
      ]);
      if (meRes.ok) setUser((await meRes.json()).user);
      if (prizesRes.ok) setPrizes((await prizesRes.json()).prizes || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleRedeem = async (prizeId: string, prizeName: string) => {
    if (!user) {
      toast.error("Necesitás estar logueado para canjear premios");
      return;
    }
    setRedeeming((prev) => ({ ...prev, [prizeId]: true }));
    try {
      const res = await apiFetch("/api/participant/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al canjear el premio");
        return;
      }
      toast.success(`¡Canjeaste "${prizeName}"! 🎁 Te contactaremos pronto.`);
      // Refresh user points
      const meRes = await apiFetch("/api/auth/me");
      if (meRes.ok) setUser((await meRes.json()).user);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRedeeming((prev) => ({ ...prev, [prizeId]: false }));
    }
  };

  if (loading) return <LoadingScreen text="Cargando premios..." />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <Gift className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-white">
            PREMIOS <span className="text-red-500">GAMING</span>
          </h1>
          <p className="text-gray-500 mt-1">Canjeá tus puntos por productos exclusivos</p>
          {user && (
            <div className="inline-flex items-center gap-2 mt-3 bg-yellow-900/20 border border-yellow-600/30 text-yellow-400 px-4 py-2 rounded-full text-sm font-bold">
              <Star className="w-4 h-4 fill-yellow-400" />
              Tenés {user.totalPoints} puntos disponibles
            </div>
          )}
        </div>

        {!user && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-6 text-center mb-8">
            <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 mb-3">
              Necesitás una cuenta para canjear premios
            </p>
            <Link href="/register">
              <Button variant="primary" size="md">Participar ahora</Button>
            </Link>
          </div>
        )}

        {prizes.length === 0 && (
          <Card className="p-10 text-center">
            <Gift className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Pronto habrá premios disponibles.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {prizes.filter((p) => p.active).map((prize, i) => {
            const canAfford = user && user.totalPoints >= prize.requiredPoints;
            const missing = user ? prize.requiredPoints - user.totalPoints : 0;

            return (
              <motion.div
                key={prize.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="h-full"
              >
                <button
                  className="w-full h-full text-left"
                  onClick={() => setSelectedPrize(prize)}
                >
                  <Card className="overflow-hidden h-full flex flex-col hover:border-red-600/40 transition-colors cursor-pointer">
                    {/* Image */}
                    <div className="relative w-full aspect-[5/2] bg-[#1a1a1a] border-b border-[#222] overflow-hidden">
                      {prize.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full flex items-center justify-center"><span className="text-5xl">🎁</span></div>
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

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-white font-bold text-lg mb-1">{prize.name}</h3>
                      <p className="text-gray-500 text-sm mb-4 leading-relaxed line-clamp-1 h-[1.375rem]">
                        {prize.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-400 font-black">{prize.requiredPoints.toLocaleString("es-AR")}</span>
                          <span className="text-gray-600 text-xs">pts</span>
                        </div>
                        {canAfford ? (
                          <span className="text-xs text-green-400 font-bold">✓ Podés canjear</span>
                        ) : missing && missing > 0 ? (
                          <span className="text-xs text-gray-600">Faltan {missing.toLocaleString("es-AR")} pts</span>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Footer />

      <AnimatePresence>
        {selectedPrize && (
          <PrizeDetailModal
            prize={selectedPrize}
            user={user}
            redeeming={!!redeeming[selectedPrize.id]}
            onClose={() => setSelectedPrize(null)}
            onRedeem={(id, name) => {
              handleRedeem(id, name);
              setSelectedPrize(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
