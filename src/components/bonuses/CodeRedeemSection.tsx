"use client";

import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { MessageCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import type { CodeType } from "@/lib/purchase-code";
import { codeTypeLabel } from "@/lib/purchase-code";

interface Redemption {
  id: string;
  code: string;
  type: string;
  points: number;
  status: string;
}

interface CodeRedeemSectionProps {
  type: CodeType;
  title: string;
  description: string;
  steps: string[];
  icon: ReactNode;
  placeholder: string;
  accentClass?: string;
  whatsappHref?: string | null;
  whatsappLabel?: string;
  externalHref?: string | null;
  externalLabel?: string;
}

export function CodeRedeemSection({
  type,
  title,
  description,
  steps,
  icon,
  placeholder,
  accentClass = "border-red-600/20 bg-gradient-to-br from-red-950/20 via-[#111] to-[#111]",
  whatsappHref,
  whatsappLabel,
  externalHref,
  externalLabel,
}: CodeRedeemSectionProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  const load = async () => {
    const res = await apiFetch(`/api/participant/purchase-codes?type=${type}`);
    if (res.ok) {
      const data = await res.json();
      setRedemptions(data.redemptions || []);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      toast.error("Ingresá el código que te dieron");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/participant/purchase-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo cargar el código");
        return;
      }
      toast.success(data.message || "Código enviado para revisión");
      setCode("");
      await load();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "redeemed") {
      return (
        <Badge variant="success">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Acreditado
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge variant="warning">
          <Clock className="w-3 h-3 mr-1" />
          En revisión
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="error">
          <XCircle className="w-3 h-3 mr-1" />
          Rechazado
        </Badge>
      );
    }
    return <Badge variant="default">{status}</Badge>;
  };

  return (
    <Card className={`p-5 sm:p-6 ${accentClass}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-400 shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-white font-black uppercase tracking-wide text-sm sm:text-base">
            {title}
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <ol className="text-gray-500 text-xs sm:text-sm space-y-1.5 mb-4 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 mb-4">
        {externalHref && externalLabel && (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600/15 border border-purple-500/40 text-purple-300 text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-purple-600/25 transition-colors"
          >
            {externalLabel}
          </a>
        )}
        {whatsappHref && whatsappLabel && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-[#25D366]/25 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {whatsappLabel}
          </a>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md">
        <Input
          placeholder={placeholder}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-mono tracking-wider"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          variant="primary"
          size="md"
          loading={submitting}
          onClick={handleSubmit}
          className="sm:shrink-0"
        >
          Cargar código
        </Button>
      </div>

      {redemptions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#222] space-y-2">
          <p className="text-gray-600 text-[10px] uppercase tracking-widest">Tus códigos</p>
          {redemptions.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]"
            >
              <div className="min-w-0">
                <span className="font-mono text-sm text-white block">{r.code}</span>
                <span className="text-gray-600 text-[10px]">{codeTypeLabel(r.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold text-sm">+{r.points} pts</span>
                {statusBadge(r.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
