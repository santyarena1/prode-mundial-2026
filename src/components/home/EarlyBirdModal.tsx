"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, Star } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function EarlyBirdModal({ onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-[#111] border border-yellow-500/30 rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>

          {/* Stars decoration */}
          <div className="flex justify-center gap-1 mb-3">
            {[0, 1, 2].map((i) => (
              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ))}
          </div>

          <h2 className="text-2xl font-black uppercase text-white mb-2">
            ¡Llegaste a tiempo!
          </h2>
          <p className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-4">
            Participante early bird
          </p>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-5">
            <p className="text-gray-200 text-sm leading-relaxed">
              Te registraste <strong className="text-white">antes del inicio del Mundial</strong>, así que te regalamos{" "}
              <strong className="text-yellow-400">una entrada automática al primer sorteo semanal</strong>.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mb-6">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            Tu entrada ya está registrada — no necesitás hacer nada más.
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition-colors uppercase tracking-wider text-sm"
          >
            ¡Perfecto, a jugar!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
