"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Handshake, Mail, Phone, AtSign, ChevronDown, Trash2, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface Inquiry {
  id: string;
  name: string;
  brand: string;
  email: string;
  phone?: string | null;
  instagram?: string | null;
  reason: string;
  offer: string;
  message?: string | null;
  status: string;
  adminNotes?: string | null;
  createdAt: string;
}

const OFFER_LABELS: Record<string, string> = {
  prize: "🎁 Premio para canjear",
  bonus: "📣 Acción bonus",
  both: "🔥 Premio + Acción bonus",
  other: "💬 Otra idea",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "default" | "error" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  reviewing: { label: "En revisión", variant: "default" },
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "error" },
};

export default function SponsorInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/sponsor-inquiries")
      .then(r => r.json())
      .then(d => setInquiries(d.inquiries || []))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setSaving(p => ({ ...p, [id]: true }));
    const res = await fetch(`/api/admin/sponsor-inquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setInquiries(p => p.map(i => i.id === id ? { ...i, status } : i));
      toast.success("Estado actualizado");
    }
    setSaving(p => ({ ...p, [id]: false }));
  };

  const saveNotes = async (id: string) => {
    setSaving(p => ({ ...p, [`notes_${id}`]: true }));
    const res = await fetch(`/api/admin/sponsor-inquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes: notes[id] ?? "" }),
    });
    if (res.ok) {
      setInquiries(p => p.map(i => i.id === id ? { ...i, adminNotes: notes[id] } : i));
      toast.success("Nota guardada");
    }
    setSaving(p => ({ ...p, [`notes_${id}`]: false }));
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm("¿Eliminar esta consulta?")) return;
    const res = await fetch(`/api/admin/sponsor-inquiries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInquiries(p => p.filter(i => i.id !== id));
      toast.success("Eliminada");
    }
  };

  if (loading) return <LoadingScreen />;

  const pending = inquiries.filter(i => i.status === "pending").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white flex items-center gap-2">
          <Handshake className="w-6 h-6 text-red-400" />
          Consultas de sponsors
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {inquiries.length} consultas en total · {pending} pendientes
        </p>
      </div>

      {inquiries.length === 0 && (
        <Card className="p-10 text-center">
          <Handshake className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Todavía no hay consultas de sponsors.</p>
        </Card>
      )}

      <div className="space-y-3">
        {inquiries.map(inq => {
          const isOpen = expanded === inq.id;
          const cfg = STATUS_CONFIG[inq.status] ?? STATUS_CONFIG.pending;

          return (
            <Card key={inq.id} className={`overflow-hidden transition-all ${inq.status === "pending" ? "border-yellow-600/20" : ""}`}>
              {/* Header row */}
              <button
                type="button"
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#111] transition-colors"
                onClick={() => setExpanded(isOpen ? null : inq.id)}
              >
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-sm font-black text-red-400">
                  {inq.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{inq.name}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-400 text-sm">{inq.brand}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-gray-600 text-xs">{OFFER_LABELS[inq.offer] ?? inq.offer}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-gray-700 text-xs">{new Date(inq.createdAt).toLocaleDateString("es-AR")}</span>
                  </div>
                </div>
                <Badge variant={cfg.variant} className="flex-shrink-0">{cfg.label}</Badge>
                <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-[#1a1a1a] px-4 pb-4 pt-4 space-y-4">

                  {/* Contact */}
                  <div className="flex flex-wrap gap-3">
                    <a href={`mailto:${inq.email}`} className="flex items-center gap-1.5 text-blue-400 text-xs hover:underline">
                      <Mail className="w-3.5 h-3.5" />{inq.email}
                    </a>
                    {inq.phone && (
                      <a href={`https://wa.me/${inq.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-400 text-xs hover:underline">
                        <Phone className="w-3.5 h-3.5" />{inq.phone}
                      </a>
                    )}
                    {inq.instagram && (
                      <a href={`https://instagram.com/${inq.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-pink-400 text-xs hover:underline">
                        <AtSign className="w-3.5 h-3.5" />{inq.instagram}
                      </a>
                    )}
                  </div>

                  {/* Content */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-[#111] rounded-xl p-3">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">¿Por qué quiere participar?</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{inq.reason}</p>
                    </div>
                    {inq.message && (
                      <div className="bg-[#111] rounded-xl p-3">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">¿Qué ofrecería?</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{inq.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Status selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-600 text-xs uppercase tracking-wider">Estado:</span>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <button
                        key={val}
                        type="button"
                        disabled={saving[inq.id]}
                        onClick={() => updateStatus(inq.id, val)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                          inq.status === val
                            ? "bg-red-600/20 border-red-500/40 text-red-400"
                            : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-[#444] hover:text-gray-300"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="flex items-center gap-1.5 text-gray-600 text-xs uppercase tracking-wider mb-1.5">
                      <MessageSquare className="w-3 h-3" /> Notas internas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Anotá algo para seguimiento..."
                      defaultValue={inq.adminNotes ?? ""}
                      onChange={e => setNotes(p => ({ ...p, [inq.id]: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 resize-none placeholder-gray-700"
                    />
                    <div className="flex justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => deleteInquiry(inq.id)}
                        className="flex items-center gap-1 text-xs text-gray-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                      <button
                        type="button"
                        disabled={saving[`notes_${inq.id}`]}
                        onClick={() => saveNotes(inq.id)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {saving[`notes_${inq.id}`] ? "Guardando..." : "Guardar nota"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
