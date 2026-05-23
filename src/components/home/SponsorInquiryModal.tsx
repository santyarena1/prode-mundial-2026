"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Handshake, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

const OFFER_OPTIONS = [
  { value: "prize", label: "🎁 Poner un premio para canjear" },
  { value: "bonus", label: "📣 Generar una acción bonus (seguir, visitar, comprar)" },
  { value: "both", label: "🔥 Las dos cosas" },
  { value: "other", label: "💬 Otra idea" },
];

interface Props {
  onClose: () => void;
}

const empty = {
  name: "", brand: "", email: "", phone: "", instagram: "",
  reason: "", offer: "", message: "",
};

export function SponsorInquiryModal({ onClose }: Props) {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.brand || !form.email || !form.reason || !form.offer) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/public/sponsor-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al enviar"); return; }
      setSent(true);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  };

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
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#0d0d0d] border border-[#222] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh] sm:max-h-[85vh]">

          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 flex-shrink-0 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Handshake className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-wider">Quiero ser sponsor</p>
                <p className="text-gray-600 text-xs">Te contactamos a la brevedad</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {sent ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-white font-black text-xl mb-2">¡Consulta enviada!</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                El equipo de The Gamer Shop va a revisar tu propuesta y se va a poner en contacto con vos.
              </p>
              <Button variant="secondary" size="md" className="mt-6" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Nombre *</label>
                    <Input placeholder="Tu nombre y apellido" value={form.name} onChange={set("name")} />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Marca / Negocio *</label>
                    <Input placeholder="Nombre de tu marca o local" value={form.brand} onChange={set("brand")} />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Email *</label>
                  <Input type="email" placeholder="tu@email.com" value={form.email} onChange={set("email")} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">WhatsApp / Teléfono</label>
                    <Input placeholder="+54 9 11 ..." value={form.phone} onChange={set("phone")} />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Instagram</label>
                    <Input placeholder="@tutienda" value={form.instagram} onChange={set("instagram")} />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">¿Cómo querés participar? *</label>
                  <select
                    value={form.offer}
                    onChange={set("offer")}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors text-white"
                  >
                    <option value="" disabled>Seleccioná una opción</option>
                    {OFFER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">¿Por qué querés participar? *</label>
                  <textarea
                    rows={3}
                    placeholder="Contanos sobre tu marca y qué te motivó a sumarte al prode..."
                    value={form.reason}
                    onChange={set("reason")}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors resize-none placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">¿Qué ofrecerías? (opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: un voucher de descuento, un producto físico, seguimiento en redes..."
                    value={form.message}
                    onChange={set("message")}
                    className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500 transition-colors resize-none placeholder-gray-600"
                  />
                </div>

                <p className="text-gray-700 text-xs leading-relaxed">
                  * La participación queda sujeta a la decisión de The Gamer Shop.
                </p>
              </div>

              <div className="px-5 pb-6 pt-3 flex-shrink-0 border-t border-[#1a1a1a]">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={sending}
                  onClick={handleSubmit}
                >
                  Enviar consulta
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
