"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, CheckCircle2, Repeat, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface VirtualAlbumModalProps {
  open: boolean;
  onClose: () => void;
}

export function VirtualAlbumModal({ open, onClose }: VirtualAlbumModalProps) {
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!open) return;
    setChecking(true);
    apiFetch("/api/participant/virtual-album-interest")
      .then((r) => r.json())
      .then((d) => setInterested(!!d.interested))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [open]);

  const handleInterest = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/participant/virtual-album-interest", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Ups, no pudimos anotarte. Probá de nuevo.");
        return;
      }
      setInterested(true);
      toast.success(data.message || "¡Listo! Te avisamos apenas esté.");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
            onClick={() => !loading && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-lg w-full p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <Badge variant="info" className="mb-1.5">
                      Para vos
                    </Badge>
                    <h2 className="text-white font-black text-lg uppercase tracking-wide leading-tight">
                      Álbum virtual
                    </h2>
                    <p className="text-amber-400/90 text-[10px] uppercase tracking-wider mt-0.5">
                      Todavía en armado
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Acá vas a poder llevar tu álbum al día: qué figuritas tenés, cuáles te faltan y con quién
                podés cambiar repetidas. <strong className="text-white">No suma puntos del prode</strong> — es
                aparte, tranqui, para los que coleccionan de verdad.
              </p>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                Sin sobres, sin sorteos, sin vueltas. Solo tu colección y la de los demás para coordinar
                cambios más fácil.
              </p>

              <div className="space-y-2.5 mb-5">
                {[
                  {
                    icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
                    title: "Lo que tenés y lo que falta",
                    text: "Anotá figuritas, repetidas y huecos del álbum sin perderte.",
                  },
                  {
                    icon: <Repeat className="w-4 h-4 text-blue-400" />,
                    title: "Repetidas para cambiar",
                    text: "Marcá las de más y si las tenés libres para intercambiar.",
                  },
                  {
                    icon: <Users className="w-4 h-4 text-purple-400" />,
                    title: "Con la comunidad",
                    text: "Mirá qué tiene cada uno y armá cambios sin mandar mil mensajes.",
                  },
                  {
                    icon: <Search className="w-4 h-4 text-amber-400" />,
                    title: "Tu álbum, tu regla",
                    text: "Cargás lo que tenés en la vida real. Acá no hay sobres ni trucos de juego.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl"
                  >
                    <span className="shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-white text-xs font-bold mb-0.5">{item.title}</p>
                      <p className="text-gray-500 text-xs leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                Todavía lo estamos armando. Si te copa, dejanos tu nombre y te avisamos apenas esté para
                usar.
              </p>

              {checking ? (
                <p className="text-gray-600 text-sm text-center py-2">Cargando...</p>
              ) : interested ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Ya estás en la lista! Te avisamos cuando salga
                  </div>
                  <Button variant="secondary" size="md" className="w-full" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Ahora no
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    loading={loading}
                    onClick={handleInterest}
                  >
                    ¡Me interesa!
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
