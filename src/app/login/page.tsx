"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me").then((res) => {
      if (res.ok) router.replace("/dashboard");
      else setCheckingAuth(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Ingresá tu email");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Email inválido");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Ingresá tu contraseña");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "User not found"
            ? "No encontramos una cuenta con ese email. ¿Te registraste?"
            : data.error === "Contraseña incorrecta"
              ? "Esa contraseña no coincide. Si nunca creaste una, elegí una nueva (6+ caracteres)."
              : data.error || "No pudimos iniciar sesión. Probá de nuevo.";
        toast.error(msg, { duration: 5000 });
        return;
      }
      toast.success("¡Bienvenido de vuelta! 🎮");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-20">
        <Card className="w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 px-4">
              <Logo size="lg" href={undefined} showTagline />
            </div>
            <h1 className="text-2xl font-black uppercase text-white">Ingresá</h1>
            <p className="text-gray-500 text-sm mt-1">
              Continuá tu Prode Mundial 2026
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Tu email"
              type="email"
              placeholder="juan@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              error={emailError}
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                error={passwordError}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-gray-600 text-xs -mt-1 leading-relaxed">
              ¿Te registraste antes sin contraseña? Poné tu email y elegí una{" "}
              <strong className="text-gray-400">contraseña nueva</strong> (mín. 6 caracteres) — no
              hace falta una vieja, se guarda al entrar.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              INGRESAR
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-gray-500 hover:text-white transition-colors"
            >
              ¿Olvidaste tu contraseña?{" "}
              <span className="text-red-400 font-medium">Recuperala por email</span>
            </Link>
            <p className="text-gray-600 text-sm">
              ¿No tenés cuenta?{" "}
              <Link href="/register" className="text-red-400 hover:text-red-300 font-medium">
                Registrate gratis
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
