"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    fetch("/api/admin/auth/me", { credentials: "include" }).then((r) => {
      if (r.ok) router.replace("/admin/dashboard");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email requerido";
    if (!password.trim()) newErrors.password = "Contraseña requerida";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Credenciales incorrectas");
        return;
      }
      toast.success("¡Bienvenido al panel admin!");
      // Recarga completa para que proxy y layout reciban la cookie
      window.location.href = "/admin/dashboard";
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5 px-4">
            <Logo size="md" href={undefined} />
          </div>
          <div className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">
            Admin Panel
          </div>
          <h1 className="text-2xl font-black uppercase text-white">Acceso Restringido</h1>
          <p className="text-gray-500 text-sm mt-1">Prode Mundial Gamer 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@thegamershop.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: undefined }));
            }}
            error={errors.email}
            icon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: undefined }));
            }}
            error={errors.password}
            icon={<KeyRound className="w-4 h-4" />}
          />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
            <Lock className="w-4 h-4" />
            INGRESAR AL PANEL
          </Button>
        </form>
      </Card>
    </div>
  );
}
