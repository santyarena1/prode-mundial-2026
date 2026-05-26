"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

export interface TourStep {
  icon: string;
  title: string;
  desc: string;
}

interface Props {
  steps: TourStep[];
  storageKey: string;
  buttonLabel?: string;
}

export function GuidedTour({
  steps,
  storageKey,
  buttonLabel = "Cómo funciona",
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => {
      setOpen(true);
      setStep(0);
      localStorage.setItem(storageKey, "1");
    }, 600);
    return () => clearTimeout(t);
  }, [storageKey]);

  const close = () => setOpen(false);

  const openTour = () => {
    setStep(0);
    setOpen(true);
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <>
      <button
        onClick={openTour}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1 px-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111]"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="fixed bottom-0 inset-x-0 z-50 flex justify-center p-4 pb-safe pointer-events-none"
            >
              <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === step ? "bg-red-500 w-6" : "bg-[#333] w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                  <button onClick={close} className="text-gray-600 hover:text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="mb-6"
                  >
                    <div className="text-3xl mb-3">{current.icon}</div>
                    <h3 className="text-white font-black text-lg mb-2">{current.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{current.desc}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    disabled={step === 0}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <span className="text-xs text-gray-600">{step + 1} / {steps.length}</span>
                  {isLast ? (
                    <button
                      onClick={close}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      ¡Listo!
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep((s) => s + 1)}
                      className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
