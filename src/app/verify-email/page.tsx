"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";
import { apiFetch } from "@/lib/api";

type Status = "loading" | "success" | "already" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("El link no es válido.");
      return;
    }
    (async () => {
      try {
        const res = await apiFetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus(data.alreadyVerified ? "already" : "success");
        } else {
          setStatus("error");
          setMessage(data.error || "No se pudo verificar el email.");
        }
      } catch {
        setStatus("error");
        setMessage("Error de conexión. Probá de nuevo.");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <Card className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-black mb-2">Verificando…</h1>
              <p className="text-gray-400 text-sm">Esperá un momento.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-black mb-2">¡Email verificado!</h1>
              <p className="text-gray-400 text-sm mb-6">
                Tu cuenta está activa. Ya se acreditaron los puntos del referido
                y tus predicciones suman desde ahora.
              </p>
              <Button onClick={() => router.push("/")} className="w-full">
                Ir al inicio
              </Button>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-black mb-2">Ya estabas verificado</h1>
              <p className="text-gray-400 text-sm mb-6">
                Tu cuenta ya estaba activa. Podés seguir usando la app normalmente.
              </p>
              <Button onClick={() => router.push("/")} className="w-full">
                Ir al inicio
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-black mb-2">No se pudo verificar</h1>
              <p className="text-gray-400 text-sm mb-6">{message}</p>
              <Link href="/" className="block">
                <Button className="w-full">Volver al inicio</Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
