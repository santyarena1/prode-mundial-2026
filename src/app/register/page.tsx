"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mail, Phone, User, AtSign, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";
import { apiFetch } from "@/lib/api";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  instagram: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.firstName.trim()) errors.firstName = "El nombre es requerido";
  if (!data.lastName.trim()) errors.lastName = "El apellido es requerido";
  if (!data.phone.trim()) errors.phone = "El teléfono es requerido";
  else if (!/^\+?[0-9]{8,15}$/.test(data.phone.replace(/\s/g, "")))
    errors.phone = "Teléfono inválido";
  if (!data.email.trim()) errors.email = "El email es requerido";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Email inválido";
  if (!data.password) errors.password = "La contraseña es requerida";
  else if (data.password.length < 6) errors.password = "Mínimo 6 caracteres";
  if (!data.confirmPassword) errors.confirmPassword = "Repetí la contraseña";
  else if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Las contraseñas no coinciden";
  if (!data.acceptedTerms) errors.acceptedTerms = "Debés aceptar las bases y condiciones";
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    instagram: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [inviteCode, setInviteCode] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    apiFetch("/api/auth/me").then((r) => {
      if (r.ok) router.replace("/dashboard");
      else setCheckingAuth(false);
    });
  }, [router]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          instagram: form.instagram.trim() || undefined,
          inviteCode: inviteCode.trim().toUpperCase() || undefined,
          acceptedTerms: form.acceptedTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al registrarse");
        return;
      }
      toast.success("¡Cuenta creada! Bienvenido al prode 🎮");
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
      <div className="flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 px-4">
              <Logo size="lg" href={undefined} showTagline />
            </div>
            <h1 className="text-2xl font-black uppercase text-white">Creá tu cuenta</h1>
            <p className="text-gray-500 text-sm mt-1">Unite al Prode Mundial Gamer 2026</p>
          </div>

          <Link href="/login" className="block mb-4">
            <div className="border border-[#333] hover:border-red-500/50 bg-[#0f0f0f] hover:bg-red-950/10 rounded-xl px-4 py-3 text-center transition-colors">
              <span className="text-gray-400 text-sm">¿Ya tenés cuenta? </span>
              <span className="text-red-400 font-bold text-sm">INICIÁ SESIÓN →</span>
            </div>
          </Link>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre"
                placeholder="Juan"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                error={errors.firstName}
                icon={<User className="w-4 h-4" />}
              />
              <Input
                label="Apellido"
                placeholder="García"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                error={errors.lastName}
                icon={<User className="w-4 h-4" />}
              />
            </div>

            <Input
              label="Teléfono"
              type="tel"
              placeholder="+54 9 11 1234-5678"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              error={errors.phone}
              icon={<Phone className="w-4 h-4" />}
            />

            <Input
              label="Email"
              type="email"
              placeholder="juan@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Instagram (opcional)"
              placeholder="@jugador123"
              value={form.instagram}
              onChange={(e) => handleChange("instagram", e.target.value)}
              icon={<AtSign className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Código de invitación (opcional)"
                placeholder="Ej: ABC12345"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <p className="text-gray-700 text-xs mt-1">Si alguien te invitó al prode, ingresá su código para darle puntos extra.</p>
            </div>

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                error={errors.password}
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

            <div className="relative">
              <Input
                label="Repetí la contraseña"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(e) => handleChange("acceptedTerms", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    form.acceptedTerms
                      ? "bg-red-600 border-red-600"
                      : "bg-transparent border-[#444] group-hover:border-red-500"
                  }`}
                >
                  {form.acceptedTerms && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-400 leading-relaxed">
                Acepto las{" "}
                <Link href="/terminos" target="_blank" className="text-red-400 hover:text-red-300 underline">
                  bases y condiciones
                </Link>{" "}
                del prode
              </span>
            </label>
            {errors.acceptedTerms && (
              <p className="text-red-400 text-xs -mt-2">{errors.acceptedTerms}</p>
            )}

            <p className="text-gray-600 text-xs flex items-start gap-1.5">
              <span className="text-green-500 flex-shrink-0">🔒</span>
              Tu email y teléfono se usan solo para notificarte sobre el Prode. No hacemos spam ni compartimos tus datos.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              <Lock className="w-4 h-4" />
              EMPEZAR MI PRODE
            </Button>
          </form>

        </Card>
      </div>
    </div>
  );
}
