"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError("Ingresá tu email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Email inválido");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        toast.error("Error al enviar el email. Intentá de nuevo.");
      }
    } catch {
      toast.error("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-20">
        <Card className="w-full max-w-sm p-8">
          <div className="flex justify-center mb-6 px-4">
            <Logo size="lg" href={undefined} showTagline />
          </div>

          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h1 className="text-xl font-black uppercase text-white mb-2">Revisá tu email</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-1">
                Si existe una cuenta con <strong className="text-gray-300">{email}</strong>,
                te enviamos un link para restablecer tu contraseña.
              </p>
              <p className="text-gray-600 text-xs mb-6">El link es válido por 1 hora.</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black uppercase text-white">¿Olvidaste tu contraseña?</h1>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Ingresá tu email y te mandamos un link para elegir una nueva.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Tu email"
                  type="email"
                  placeholder="juan@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  error={emailError}
                  icon={<Mail className="w-4 h-4" />}
                />

                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  ENVIAR LINK DE RECUPERACIÓN
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
