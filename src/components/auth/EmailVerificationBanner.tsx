"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

export function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.user && data.user.emailVerified === false) {
          setEmail(data.user.email || "");
          setShow(true);
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await apiFetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Te reenviamos el email de verificación.");
      } else {
        toast.error(data.error || "No pudimos reenviar el email.");
      }
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setSending(false);
    }
  };

  if (!show || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 text-xs sm:text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <div className="flex-1 text-amber-100">
          <span className="font-bold">Verificá tu email{email ? ` (${email})` : ""}</span>{" "}
          <span className="text-amber-200/80">
            — tus puntos y el bonus de referido no se acreditan hasta que verifiques.
          </span>
        </div>
        <button
          onClick={resend}
          disabled={sending}
          className="flex-shrink-0 px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Reenviar"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 text-amber-300 hover:text-amber-100"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
