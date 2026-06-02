"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Clock, XCircle, Link as LinkIcon, X, Shuffle, AlertTriangle, Shield, Copy, Users, ExternalLink, Ticket, Download, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { GuidedTour } from "@/components/ui/GuidedTour";
import { shouldShowWelcomeModal } from "@/lib/welcome-modal";
import { PurchaseCodeSection } from "@/components/bonuses/PurchaseCodeSection";
import { apiFetch } from "@/lib/api";

const BONUSES_TOUR = [
  { icon: "🎟️", title: "Códigos de compra", desc: "Si compraste un producto en The Gamer Shop, tenés un código único. Ingresalo acá para sumar puntos instantáneamente." },
  { icon: "⚡", title: "Acciones bonus", desc: "Seguí a nuestras cuentas en redes, mencioná el prode o completá otras acciones para ganar puntos. Cargá el comprobante y esperá la aprobación." },
  { icon: "👥", title: "Invitá amigos", desc: "Compartí tu código de referido. Cuando alguien se registra con tu código y completa su perfil, ambos ganan puntos de bonificación." },
  { icon: "✅", title: "Aprobación rápida", desc: "Las acciones que requieren evidencia son revisadas por el equipo. Generalmente se aprueban dentro de 24-48 horas." },
];

const HANDLE_LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
  twitter: "X / Twitter", facebook: "Facebook", twitch: "Twitch",
};

interface BonusAction {
  id: string;
  name: string;
  description: string;
  points: number;
  requiresEvidence: boolean;
  actionUrl?: string | null;
  requiredHandles?: string | null;
  imageUrl?: string | null;
  active: boolean;
  claimedStatus: string | null;
  sponsor?: { name: string };
}

interface ReferralData {
  referralCode: string | null;
  referralPoints: number;
  referralCount: number;
  pointsPerReferral: number;
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
  const [activeTab, setActiveTab] = useState<"codes" | "actions" | "referral">("codes");
  const [copied, setCopied] = useState(false);
  const [socialHandles, setSocialHandles] = useState<Record<string, Record<string, string>>>({});
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);

  useEffect(() => {
    const init = async () => {
      const meRes = await apiFetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }
      const meData = await meRes.json();
      const userId = meData.user?.id;
      const [bonRes, refRes] = await Promise.all([
        apiFetch("/api/participant/bonuses"),
        apiFetch("/api/participant/referral"),
      ]);
      let sortedBonuses: BonusAction[] = [];
      if (bonRes.ok) {
        const data = await bonRes.json();
        sortedBonuses = (data.bonusActions || []).sort((a: BonusAction, b: BonusAction) => b.points - a.points);
        setBonuses(sortedBonuses);
      }
      if (refRes.ok) setReferral(await refRes.json());
      const featureUsed = sortedBonuses.some((b) => b.claimedStatus && b.claimedStatus !== "rejected");
      if (userId && shouldShowWelcomeModal(`bonuses_welcome_${userId}`, featureUsed)) {
        setShowWelcomeModal(true);
      }
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
          socialHandles: socialHandles[bonusId] && Object.keys(socialHandles[bonusId]).length > 0 ? socialHandles[bonusId] : undefined,
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

  const handleShareImage = async (url: string) => {
    setSharingImage(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "plantilla-historia.jpg", { type: blob.type });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Plantilla de historia" });
        return;
      }
    } catch { /* fall through */ }
    finally { setSharingImage(false); }
    window.open(url, "_blank");
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

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black uppercase text-white">
              GANÁ PUNTOS <span className="text-green-400">EXTRA</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Sumá puntos adicionales fuera del prode</p>
          </div>
          <div className="flex-shrink-0 mt-1">
            <GuidedTour steps={BONUSES_TOUR} storageKey="bonuses_tour" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6">
          {[
            { key: "codes" as const, label: "Códigos", icon: <Ticket className="w-3.5 h-3.5" /> },
            { key: "actions" as const, label: `Acciones${bonuses.length > 0 ? ` (${bonuses.length})` : ""}`, icon: <Zap className="w-3.5 h-3.5" /> },
            { key: "referral" as const, label: "Invitar amigos", icon: <Users className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.key ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Codes tab */}
        {activeTab === "codes" && <PurchaseCodeSection />}

        {/* Actions tab */}
        {activeTab === "actions" && (
          <div className="space-y-3">
            {bonuses.length === 0 && (
              <Card className="p-10 text-center">
                <Zap className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No hay acciones bonus disponibles en este momento.</p>
              </Card>
            )}
            {bonuses.map((bonus, i) => (
              <motion.div
                key={bonus.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-bold text-sm">{bonus.name}</h3>
                        {bonus.sponsor && (
                          <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">
                            by {bonus.sponsor.name}
                          </span>
                        )}
                        {statusBadge(bonus.claimedStatus)}
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {bonus.description}
                      </p>
                      {bonus.requiresEvidence && !bonus.claimedStatus && (
                        <Input
                          placeholder="URL de evidencia"
                          value={evidenceUrls[bonus.id] || ""}
                          onChange={(e) => setEvidenceUrls((prev) => ({ ...prev, [bonus.id]: e.target.value }))}
                          icon={<LinkIcon className="w-4 h-4" />}
                          className="mt-2 max-w-xs"
                        />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-green-400 font-black text-lg leading-none">
                        +{bonus.points}<span className="text-gray-600 font-normal text-xs ml-0.5">pts</span>
                      </div>
                      {!bonus.claimedStatus ? (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={claiming[bonus.id]}
                          onClick={() => { setRedirectDone(false); setModalBonus(bonus); setSocialHandles((p) => ({ ...p, [bonus.id]: p[bonus.id] || {} })); }}
                          className="bg-green-600 hover:bg-green-500 text-xs"
                        >
                          Reclamar
                        </Button>
                      ) : (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Ya reclamado</span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Referral tab */}
        {activeTab === "referral" && referral && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-bold">Código de invitación</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Compartí tu código. Cada amigo que lo use al registrarse te suma{" "}
                <span className="text-green-400 font-bold">+{referral.pointsPerReferral} pts automáticamente</span>.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-3 font-mono text-white font-black tracking-widest text-xl flex-1 text-center sm:flex-none sm:text-left">
                  {referral.referralCode ?? "—"}
                </div>
                <button
                  onClick={copyReferralCode}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 transition-colors font-semibold text-sm"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              {referral.referralCode && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `¡Unite al Prode Mundial Gamer 2026! 🏆⚽\n\nRegistrate gratis y competí por premios reales.\n\n👉 https://thegamershop-premios.com/register\n\nUsa mi código al registrarte y los dos ganamos puntos extra:\n🎟️ Código: *${referral.referralCode}*`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors mb-5"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Compartir por WhatsApp
                </a>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-green-400">{referral.referralCount}</div>
                  <div className="text-gray-600 text-xs uppercase tracking-wider mt-1">Amigos invitados</div>
                </div>
                <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-yellow-400">+{referral.referralPoints}</div>
                  <div className="text-gray-600 text-xs uppercase tracking-wider mt-1">Puntos ganados</div>
                </div>
              </div>
            </Card>
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <p className="text-gray-600 text-xs leading-relaxed">
                💡 Cada vez que alguien se registra usando tu código, los puntos se acreditan automáticamente — no necesitás hacer nada más.
              </p>
            </div>
          </div>
        )}
        {activeTab === "referral" && !referral && (
          <Card className="p-10 text-center">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Cargando...</p>
          </Card>
        )}

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
              <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto max-h-[85vh] flex flex-col">
                <div className="overflow-y-auto flex-1 p-6">
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
                <div className="p-3.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-4">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Qué tenés que hacer</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{modalBonus.description}</p>
                </div>

                {/* Reference image / template */}
                {modalBonus.imageUrl && (
                  <div className="mb-5">
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Plantilla de referencia</p>
                    <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={modalBonus.imageUrl}
                        alt="Plantilla de referencia"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <button
                      onClick={() => handleShareImage(modalBonus.imageUrl!)}
                      disabled={sharingImage}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      {sharingImage ? "Cargando..." : "Guardar imagen"}
                    </button>
                  </div>
                )}

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

                {/* Social handle inputs */}
                {(() => {
                  let handles: string[] = [];
                  try { handles = modalBonus.requiredHandles ? JSON.parse(modalBonus.requiredHandles) : []; } catch { handles = []; }
                  if (handles.length === 0) return null;
                  return (
                    <div className="mb-5 space-y-3">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Tu usuario en:</p>
                      {handles.map((platform) => (
                        <Input
                          key={platform}
                          placeholder={`Tu @ en ${HANDLE_LABELS[platform] ?? platform}`}
                          value={socialHandles[modalBonus.id]?.[platform] || ""}
                          onChange={(e) => setSocialHandles((prev) => ({
                            ...prev,
                            [modalBonus!.id]: { ...(prev[modalBonus!.id] || {}), [platform]: e.target.value },
                          }))}
                          label={HANDLE_LABELS[platform] ?? platform}
                        />
                      ))}
                    </div>
                  );
                })()}

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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* First-time welcome modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" onClick={() => setShowWelcomeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-[#111] border border-green-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto max-h-[85vh] overflow-y-auto">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">⚡</div>
                  <h2 className="text-white font-black text-xl mb-1">¡Ganá puntos extra!</h2>
                  <p className="text-gray-400 text-sm">Esta sección es tu forma de sumar puntos más allá del prode</p>
                </div>
                <div className="space-y-3 mb-5">
                  {[
                    { icon: "🛒", title: "Códigos de compra", desc: "Comprá en la tienda y registrá el código para sumar puntos automáticamente.", pts: "Variable" },
                    { icon: "⚽", title: "Acciones bonus", desc: "Seguinos en redes, compartí contenido, participá en encuestas y más.", pts: "Hasta 2.000 pts" },
                    { icon: "👥", title: "Invitá amigos", desc: "Cada amigo que se registra con tu código te da puntos extra.", pts: "Puntos por referido" },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#222]">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{item.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                        <p className="text-green-400 font-bold text-xs mt-1">{item.pts}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center mb-4">
                  <p className="text-green-400 text-sm font-bold">💡 Más puntos = más chances de ganar premios</p>
                  <p className="text-green-600 text-xs mt-0.5">Participar activamente puede darte miles de puntos adicionales</p>
                </div>
                <button onClick={() => setShowWelcomeModal(false)}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-colors text-sm uppercase tracking-wider">
                  ¡Empezar a sumar puntos!
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
