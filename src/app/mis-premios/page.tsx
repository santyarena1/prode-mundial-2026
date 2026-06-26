"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gift, Package, CheckCircle2, Clock, XCircle, ArrowLeft, ChevronRight, Ticket } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface Redemption {
  id: string;
  status: string;
  pointsSpent: number;
  createdAt: string;
  prize: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    prizeType: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: "success" | "warning" | "error" | "default" }> = {
  pending:   { label: "Pendiente de aprobación", icon: <Clock className="w-3.5 h-3.5" />,        variant: "warning" },
  approved:  { label: "Aprobado",                icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "success" },
  delivered: { label: "Entregado",               icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "success" },
  rejected:  { label: "Rechazado",               icon: <XCircle className="w-3.5 h-3.5" />,      variant: "error" },
};

type FilterKey = "all" | "pending" | "approved" | "delivered" | "rejected";

export default function MisPremiosPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) { router.replace("/login"); return; }

      const res = await apiFetch("/api/participant/redemptions");
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data.redemptions || []);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <LoadingScreen />;

  const filtered = filter === "all" ? redemptions : redemptions.filter((r) => r.status === filter);

  const counts: Record<FilterKey, number> = {
    all: redemptions.length,
    pending: redemptions.filter((r) => r.status === "pending").length,
    approved: redemptions.filter((r) => r.status === "approved").length,
    delivered: redemptions.filter((r) => r.status === "delivered").length,
    rejected: redemptions.filter((r) => r.status === "rejected").length,
  };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendientes" },
    { key: "approved", label: "Aprobados" },
    { key: "delivered", label: "Entregados" },
    { key: "rejected", label: "Rechazados" },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-20">
        <div className="max-w-2xl mx-auto px-4">

          {/* Header */}
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <h1 className="text-2xl font-black text-white">Mis premios</h1>
            <p className="text-gray-500 text-sm mt-0.5">Historial de todos tus canjes</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-5">
            {FILTERS.filter((f) => counts[f.key] > 0 || f.key === "all").map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === f.key
                    ? "bg-red-600 text-white"
                    : "bg-[#111] border border-[#222] text-gray-500 hover:text-gray-300"
                }`}
              >
                {f.label} {counts[f.key] > 0 && <span className="opacity-70">({counts[f.key]})</span>}
              </button>
            ))}
          </div>

          {/* Empty state */}
          {redemptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#222] flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-white font-bold text-lg mb-1">Sin canjes todavía</p>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                Acumulá puntos y canjeá productos gaming exclusivos.
              </p>
              <Link href="/prizes">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors">
                  <Gift className="w-4 h-4" /> Ver premios disponibles
                </button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">
              No hay canjes con este estado.
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((red, i) => {
                const st = STATUS_CONFIG[red.status] ?? { label: red.status, icon: null, variant: "default" as const };
                return (
                  <motion.div
                    key={red.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Prize image or icon */}
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 overflow-hidden ${red.prize.prizeType === "raffle" ? "bg-amber-500/10 border-amber-500/20" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
                        {red.prize.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={red.prize.imageUrl} alt={red.prize.name} className="w-full h-full object-cover" />
                        ) : red.prize.prizeType === "raffle" ? (
                          <Ticket className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Gift className="w-6 h-6 text-purple-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white font-bold leading-snug">{red.prize.name}</p>
                          {red.pointsSpent > 0
                            ? <span className="text-red-400 font-black text-sm flex-shrink-0">-{red.pointsSpent} pts</span>
                            : <span className="text-amber-400 font-black text-sm flex-shrink-0">Gratis</span>
                          }
                        </div>
                        {red.prize.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{red.prize.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant={st.variant} className="flex items-center gap-1 text-[11px]">
                            {st.icon} {st.label}
                          </Badge>
                          <span className="text-gray-600 text-xs">
                            {new Date(red.createdAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {red.status === "pending" && (
                          <p className="text-gray-600 text-xs mt-1.5">
                            The Gamer Shop va a contactarte para coordinar la entrega.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          {redemptions.length > 0 && (
            <div className="mt-8 text-center">
              <Link href="/prizes" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors font-semibold">
                Ver todos los premios disponibles <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
