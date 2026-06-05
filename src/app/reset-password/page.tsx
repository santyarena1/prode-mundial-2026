"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";
import { apiFetch } from "@/lib/api";

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = !password ? 0 : password.length < 6 ? 1 : password.length < 10 || !/[0-9]/.test(password) ? 2 : 3;
  const labels = ["", "Débil", "Media", "Fuerte"];
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : "bg-[#2a2a2a]"}`} />
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${strength === 1 ? "text-red-400" : strength === 2 ? "text-yellow-400" : "text-green-400"}`}>
        Contraseña {labels[strength]}
      </p>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!password) { setPasswordError("Ingresá una contraseña"); hasError = true; }
    else if (password.length < 6) { setPasswordError("Mínimo 6 caracteres"); hasError = true; }

    if (!confirmPassword) { setConfirmError("Repetí la contraseña"); hasError = true; }
    else if (password !== confirmPassword) { setConfirmError("Las contraseñas no coinciden"); hasError = true; }

    if (hasError) return;

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        toast.error(data.error || "No se pudo cambiar la contraseña.");
      }
    } catch {
      toast.error("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <Card className="w-full max-w-sm p-8">
      <div className="flex justify-center mb-6 px-4">
        <Logo size="lg" href={undefined} showTagline />
      </div>

      {done ? (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h1 className="text-xl font-black uppercase text-white mb-2">¡Contraseña actualizada!</h1>
          <p className="text-gray-500 text-sm mb-6">Ya podés ingresar con tu nueva contraseña.</p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => router.push("/login")}>
            IR AL LOGIN
          </Button>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase text-white">Nueva contraseña</h1>
            <p className="text-gray-500 text-sm mt-1">Elegí una contraseña segura para tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <div className="relative">
                <Input
                  label="Nueva contraseña"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                  error={passwordError}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={password} />
            </div>

            <div className="relative">
              <Input
                label="Repetí la contraseña"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(""); }}
                error={confirmError}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showConfirm ? "Ocultar" : "Mostrar"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {confirmPassword && password === confirmPassword && (
              <p className="flex items-center gap-1.5 text-green-400 text-xs -mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Las contraseñas coinciden
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-1">
              <Lock className="w-4 h-4" />
              GUARDAR CONTRASEÑA
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-gray-600 text-xs flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Este link es válido por 1 hora desde que lo pediste.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-20">
        <Suspense fallback={
          <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-red-500 animate-spin" />
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
