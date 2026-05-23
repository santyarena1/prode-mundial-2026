"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Clock, XCircle, Link as LinkIcon, X, Shuffle, AlertTriangle, Shield, Copy, Users, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { PurchaseCodeSection } from "@/components/bonuses/PurchaseCodeSection";
import { apiFetch } from "@/lib/api";

interface BonusAction {
  id: string;
  name: string;
  description: string;
  points: number;
  requiresEvidence: boolean;
  actionUrl?: string | null;
  active: boolean;
  claimedStatus: string | null;
  sponsor?: { name: string };
}

interface ReferralData {
  referralCode: string | null;
  referralPoints: number;
  referralCount: number;
}

export default function BonusesPage() {
  const router = useRouter();
  const [bonuses, setBonuses] = useState<BonusAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [modalBonus, setModalBonus] = useState<BonusAction | null>(null);
  const [redirectDone, setRedirectDone] = useState(false);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }
      const [bonRes, refRes] = await Promise.all([
        apiFetch("/api/participant/bonuses"),
        apiFetch("/api/participant/referral"),
      ]);
      if (bonRes.ok) {
        const data = await bonRes.json();
        const sorted = (data.bonusActions || []).sort((a: BonusAction, b: BonusAction) => b.points - a.points);
        setBonuses(sorted);
      }
      if (refRes.ok) setReferral(await refRes.json());
      setLoading(false);
    };
    init();
  }, [router]);

  const handleClaim = async (bonusId: string) => {
    setClaiming((prev) => ({ ...prev, [bonusId]: true }));
    try {
      const res = await apiFetch("/api/participant/bonuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusActionId: bonusId,
          evidenceUrl: evidenceUrls[bonusId] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al reclamar bonus");
        return;
      }
      toast.success(`+${data.pointsEarned} puntos acreditados!`);
      window.dispatchEvent(new CustomEvent("pointsUpdated"));
      const bonRes = await apiFetch("/api/participant/bonuses");
      if (bonRes.ok) {
        const d = await bonRes.json();
        const sorted = (d.bonusActions || []).sort((a: BonusAction, b: BonusAction) => b.points - a.points);
        setBonuses(sorted);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setClaiming((prev) => ({ ...prev, [bonusId]: false }));
    }
  };

  const copyReferralCode = () => {
    if (!referral?.referralCode) return;
    navigator.clipboard.writeText(referral.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (status: string | null) => {
    if (!status) return null;
    if (status === "approved") return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Aprobado</Badge>;
    if (status === "pending") return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
    if (status === "rejected") return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  if (loading) return <LoadingScreen text="Cargando bonus..." />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Zap className="w-10 h-10 text-green-400 mb-3" />
          <h1 className="text-3xl font-black uppercase text-white">
            BONUS <span className="text-green-400">EXTRA</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Códigos de compra, acciones bonus e invitaciones
          </p>
        </div>

        {/* Purchase codes */}
        <div className="mb-8">
          <PurchaseCodeSection />
        </div>

        {/* Referral section */}
        {referral && (
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
              Invitá amigos
            </h2>
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-green-400" />
                    <h3 className="text-white font-bold">Código de invitación</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">
                    Compartí tu código. Cada amigo que use tu código al registrarse te suma <span className="text-green-400 font-bold">+200 pts automáticamente</span>.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 font-mono text-white font-bold tracking-widest text-lg">
                      {referral.referralCode ?? "—"}
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 transition-colors text-sm font-semibold"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-6 sm:flex-col sm:gap-2 text-center sm:text-right flex-shrink-0">
                  <div>
                    <div className="text-2xl font-black text-green-400">{referral.referralCount}</div>
                    <div className="text-gray-600 text-xs uppercase tracking-wider">Amigos invitados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-yellow-400">+{referral.referralPoints}</div>
                    <div className="text-gray-600 text-xs uppercase tracking-wider">Puntos ganados</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
          Acciones bonus
        </h2>

        {bonuses.length === 0 && (
          <Card className="p-10 text-center">
            <Zap className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No hay acciones bonus disponibles en este momento.</p>
          </Card>
        )}

        <div className="space-y-4">
          {bonuses.map((bonus, i) => (
            <motion.div
              key={bonus.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-bold">{bonus.name}</h3>
                      {bonus.sponsor && (
                        <span className="text-xs text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">
                          by {bonus.sponsor.name}
                        </span>
                      )}
                      {statusBadge(bonus.claimedStatus)}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      {bonus.description}
                    </p>

                    {bonus.requiresEvidence && !bonus.claimedStatus && (
                      <Input
                        placeholder="URL de evidencia (link, screenshot, etc.)"
                        value={evidenceUrls[bonus.id] || ""}
                        onChange={(e) =>
                          setEvidenceUrls((prev) => ({ ...prev, [bonus.id]: e.target.value }))
                        }
                        icon={<LinkIcon className="w-4 h-4" />}
                        className="mb-3 max-w-sm"
                      />
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1 text-green-400 font-black text-xl">
                      <Zap className="w-5 h-5" />
                      +{bonus.points}
                      <span className="text-gray-600 font-normal text-sm">pts</span>
                    </div>

                    {!bonus.claimedStatus ? (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={claiming[bonus.id]}
                        onClick={() => { setRedirectDone(false); setModalBonus(bonus); }}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        RECLAMAR BONUS
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-600 uppercase tracking-wider">
                        Ya reclamado
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />

      {/* Claim modal */}
      <AnimatePresence>
        {modalBonus && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
              onClick={() => !claiming[modalBonus.id] && setModalBonus(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Shuffle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-black text-lg leading-tight">{modalBonus.name}</h2>
                      <p className="text-green-400 text-xs font-semibold">+{modalBonus.points} puntos</p>
                    </div>
                  </div>
                  <button onClick={() => setModalBonus(null)} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* What to do */}
                <div className="p-3.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-5">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Qué tenés que hacer</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{modalBonus.description}</p>
                </div>

                {/* Info cards */}
                <div className="space-y-3 mb-6">
                  <div className="flex gap-3 p-3.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                    <Shuffle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-xs font-bold mb-1">Participás en el sorteo</p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Se realizarán sorteos entre <strong className="text-gray-300">todas las personas que hayan completado esta acción</strong>.
                        Cuantos más participen, más chances hay de ganar premios especiales.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                    <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-xs font-bold mb-1">Verificación al momento del sorteo</p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Al realizarse el sorteo, verificaremos que la acción <strong className="text-gray-300">sigue activa</strong>{" "}
                        (por ej: que todavía seguís la cuenta, que el post sigue publicado, etc.).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 text-xs font-bold mb-1">Si no se puede verificar, queda anulado</p>
                      <p className="text-amber-500/80 text-xs leading-relaxed">
                        Si al momento del sorteo no podemos comprobar que completaste la acción,
                        tu participación queda <strong className="text-amber-400">automáticamente anulada</strong> y el premio pasa al siguiente ganador.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evidence input if needed */}
                {modalBonus.requiresEvidence && (
                  <div className="mb-5">
                    <p className="text-gray-400 text-xs font-semibold mb-2">URL de evidencia (requerida)</p>
                    <Input
                      placeholder="Link, screenshot, etc."
                      value={evidenceUrls[modalBonus.id] || ""}
                      onChange={e => setEvidenceUrls(prev => ({ ...prev, [modalBonus!.id]: e.target.value }))}
                      icon={<LinkIcon className="w-4 h-4" />}
                    />
                  </div>
                )}

                {/* Redirect flow */}
                {modalBonus.actionUrl && !redirectDone && (
                  <div className="mb-5 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-green-300 text-xs font-bold mb-2">Paso 1: Realizá la acción</p>
                    <p className="text-gray-400 text-xs mb-3">Hacé click para ir a completar la acción. Cuando termines, volvé acá y confirmá.</p>
                    <a
                      href={modalBonus.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setTimeout(() => setRedirectDone(true), 1500)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ir a hacer la acción
                    </a>
                  </div>
                )}

                {modalBonus.actionUrl && redirectDone && (
                  <div className="mb-5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-green-300 text-xs font-semibold">Listo, ahora confirmá tu participación abajo.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalBonus(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-semibold hover:bg-[#1a1a1a] hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={claiming[modalBonus.id]}
                    disabled={!!(modalBonus.actionUrl && !redirectDone)}
                    onClick={async () => {
                      await handleClaim(modalBonus.id);
                      setModalBonus(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {modalBonus.actionUrl ? "Ya lo hice, confirmar" : "Entendido, participar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
