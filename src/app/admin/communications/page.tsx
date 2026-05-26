"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Send, Users, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";

export default function CommunicationsPage() {
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((d) => setRecipientCount(d.recipientCount ?? 0));
  }, []);

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const res = await apiFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ subject, message, ctaUrl: ctaUrl || undefined, ctaLabel: ctaLabel || undefined }),
      }).then((r) => r.json());
      toast.success(`✅ Enviado a ${res.sent} participantes${res.failed > 0 ? ` (${res.failed} fallaron)` : ""}`);
      setSubject("");
      setMessage("");
      setCtaUrl("");
      setCtaLabel("");
    } catch {
      toast.error("Error al enviar el comunicado");
    } finally {
      setSending(false);
    }
  };

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Comunicaciones</h2>
        <p className="text-sm text-gray-500 mt-1">Enviá un email a todos los participantes registrados</p>
      </div>

      {/* Recipient count */}
      <Card className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/15 border border-blue-600/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="text-white font-bold text-lg">
            {recipientCount === null ? "..." : recipientCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">destinatarios activos (sin desuscriptos ni bloqueados)</div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6 space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asunto *</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: ¡Ya arrancó el Mundial! 🎉"
            maxLength={200}
          />
          <div className="text-right text-xs text-gray-600">{subject.length}/200</div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mensaje *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribí el cuerpo del email. Podés usar saltos de línea."
            maxLength={5000}
            rows={8}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
          />
          <div className="text-right text-xs text-gray-600">{message.length}/5000</div>
        </div>

        {/* Optional CTA */}
        <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <LinkIcon className="w-3.5 h-3.5" />
            Botón de acción (opcional)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">URL</label>
              <Input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Texto del botón</label>
              <Input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Ver mis predicciones"
                maxLength={60}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend || sending || recipientCount === 0}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? "Enviando..." : `Enviar a ${recipientCount ?? "..."} participantes`}
        </Button>
      </Card>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold">Confirmar envío</p>
                <p className="text-sm text-gray-400 mt-1">
                  Se enviará un email a <strong className="text-white">{recipientCount}</strong> participantes.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-300 bg-[#1a1a1a] rounded-lg p-3 font-medium">
              "{subject}"
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSend}>
                Sí, enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
