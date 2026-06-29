"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Package, Zap, Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  requiredPoints: number;
  stock: number;
  prizeType: string;
  isLastOne?: boolean;
  isSoldOut?: boolean;
  sponsor?: Sponsor | null;
}

interface UserData {
  totalPoints: number;
  spentPoints: number;
  firstName: string;
}

interface Props {
  prize: Prize | null;
  user: UserData | null;
  redeeming: boolean;
  onClose: () => void;
  onRedeem: (prizeId: string, prizeName: string) => void;
}

const PRIZE_TYPE_LABEL: Record<string, string> = {
  physical: "Producto físico",
  digital: "Premio digital",
  coupon: "Cupón de descuento",
  raffle: "Sorteo",
  ranking: "Premio de ranking",
  jackpot: "Gran premio",
};

export function PrizeDetailModal({ prize, user, redeeming, onClose, onRedeem }: Props) {
  if (!prize) return null;

  const availablePoints = user ? user.totalPoints - user.spentPoints : 0;
  const canAfford = user && availablePoints >= prize.requiredPoints;
  const missing = user ? prize.requiredPoints - availablePoints : null;
  const noStock = prize.stock !== 0 && prize.stock !== null;
  const progress = user ? Math.min((availablePoints / prize.requiredPoints) * 100, 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0d0d0d] border border-[#222] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92dvh] sm:max-h-[85dvh]">

          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          {/* Close */}
          <div className="flex justify-end px-4 pt-3 sm:pt-4 flex-shrink-0">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 pb-2 -mt-2">

            {/* Image */}
            <div className="relative w-full aspect-[5/2] bg-[#1a1a1a] rounded-2xl overflow-hidden mb-5">
              {prize.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-12 h-12 text-gray-700" />
                </div>
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

            {/* Type badge + name */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                {PRIZE_TYPE_LABEL[prize.prizeType] ?? "Premio"}
              </span>
              {prize.isLastOne ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
                  ¡Último disponible!
                </span>
              ) : prize.stock > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                  <Package className="w-2.5 h-2.5 inline mr-1" />
                  {prize.stock} disponibles
                </span>
              ) : null}
              {prize.sponsor && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                  por {prize.sponsor.name}
                </span>
              )}
            </div>

            <h2 className="text-white font-black text-xl leading-tight mb-3">{prize.name}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">{prize.description}</p>

            {/* Points */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-gray-400 text-sm">Puntos necesarios</span>
                </div>
                <span className="text-yellow-400 font-black text-lg">{prize.requiredPoints.toLocaleString("es-AR")}</span>
              </div>

              {user && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-white/40" />
                      <span className="text-gray-600 text-sm">Tus puntos</span>
                    </div>
                    <span className={`font-black text-sm ${canAfford ? "text-green-400" : "text-white"}`}>
                      {availablePoints.toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${canAfford ? "bg-green-500" : "bg-red-600"}`}
                    />
                  </div>

                  {!canAfford && missing && missing > 0 && (
                    <p className="text-gray-600 text-xs mt-2 text-right">
                      Te faltan <span className="text-red-400 font-bold">{missing.toLocaleString("es-AR")} puntos</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Subtle disclaimer — reads like natural copy */}
            <div className="flex gap-2.5 mb-5">
              <ShieldCheck className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-xs leading-relaxed">
                Al confirmar el canje, el equipo de The Gamer Shop se va a poner en contacto con vos para coordinar la entrega o activación del premio. Los premios están sujetos a disponibilidad y pueden variar según el stock al momento del canje.
              </p>
            </div>
          </div>

          {/* CTA fijo */}
          <div className="px-5 pt-3 flex-shrink-0 border-t border-[#1a1a1a]" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            {prize.isSoldOut ? (
              <div className="space-y-2">
                <Button variant="secondary" size="lg" className="w-full opacity-50" disabled>
                  Sin stock disponible
                </Button>
                <p className="text-center text-gray-600 text-xs">Próximamente reingreso de stock</p>
              </div>
            ) : noStock === false ? (
              <Button variant="secondary" size="lg" className="w-full" disabled>
                Sin stock disponible
              </Button>
            ) : !user ? (
              <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
                Iniciá sesión para canjear
              </Button>
            ) : canAfford ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={redeeming}
                onClick={() => onRedeem(prize.id, prize.name)}
              >
                🎁 Canjear — {prize.requiredPoints.toLocaleString("es-AR")} pts
              </Button>
            ) : (
              <Button variant="secondary" size="lg" className="w-full" disabled>
                Necesitás {missing?.toLocaleString("es-AR")} pts más
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
