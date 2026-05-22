"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  AtSign,
  Calendar,
  Trophy,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  MessageCircle,
  Shield,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { apiFetch } from "@/lib/api";
import { buildWhatsAppUrl } from "@/lib/purchase-code";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagram: string | null;
  totalPoints: number;
  predictionPoints: number;
  bonusPoints: number;
  spentPoints: number;
  createdAt: string;
  hasPassword: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({
  icon,
  label,
  value,
  copyValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyValue?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1a1a1a] last:border-0">
      <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-white text-sm font-medium break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="text-gray-600 hover:text-red-400 transition-colors shrink-0 p-1"
        title="Copiar"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [instagram, setInstagram] = useState("");
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [meRes, contactRes] = await Promise.all([
        apiFetch("/api/auth/me"),
        fetch("/api/public/contact"),
      ]);

      if (!meRes.ok) {
        router.replace("/login");
        return;
      }

      const { user: u } = await meRes.json();
      setUser(u);
      setInstagram(u.instagram?.replace(/^@/, "") ?? "");

      if (contactRes.ok) {
        const contact = await contactRes.json();
        const msg = `Hola The Gamer Shop! Olvidé mi contraseña del Prode Mundial 2026. Mi email de registro es: ${u.email}`;
        setWhatsappUrl(buildWhatsAppUrl(contact.whatsappNumber || "", msg));
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const saveInstagram = async () => {
    setSavingInstagram(true);
    try {
      const res = await apiFetch("/api/participant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: instagram ? `@${instagram.replace(/^@/, "")}` : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo guardar");
        return;
      }
      setUser(data.user);
      toast.success("Instagram actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingInstagram(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("La contraseña nueva tiene que tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    if (user?.hasPassword && !currentPassword) {
      toast.error("Ingresá tu contraseña actual");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiFetch("/api/participant/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: user?.hasPassword ? currentPassword : undefined,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo cambiar la contraseña");
        return;
      }
      toast.success(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  const availablePoints = user.totalPoints - user.spentPoints;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 pb-16">
        <div className="flex flex-col items-center text-center mb-8">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            seed={user.id}
            size="xl"
            className="mb-4"
          />
          <h1 className="text-2xl font-black uppercase text-white tracking-wide">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Mi perfil</p>
          <Badge variant="points" className="mt-3">
            <Trophy className="w-3 h-3 mr-1" />
            {user.totalPoints} pts totales
          </Badge>
        </div>

        <Card className="mb-6">
          <CardBody>
            <h2 className="text-white font-bold uppercase text-xs tracking-wider mb-1">
              Tus datos
            </h2>
            <p className="text-gray-600 text-xs mb-4">
              Guardalos por las dudas — te sirven para entrar y para recuperar la cuenta.
            </p>
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="Email (para ingresar)"
              value={user.email}
            />
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Teléfono"
              value={user.phone}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Te sumaste"
              value={formatDate(user.createdAt)}
            />
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardBody>
            <h2 className="text-white font-bold uppercase text-xs tracking-wider mb-4">
              Puntos
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                { label: "Predicciones", value: user.predictionPoints },
                { label: "Bonus", value: user.bonusPoints },
                { label: "Gastados", value: user.spentPoints },
                { label: "Disponibles", value: availablePoints },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3"
                >
                  <p className="text-gray-500 text-[10px] uppercase">{item.label}</p>
                  <p className="text-white font-black text-lg">{item.value}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <AtSign className="w-4 h-4 text-pink-400" />
              <h2 className="text-white font-bold uppercase text-xs tracking-wider">
                Instagram
              </h2>
            </div>
            <p className="text-gray-600 text-xs mb-3">Opcional — lo usamos para bonus y contacto.</p>
            <div className="flex gap-2">
              <Input
                placeholder="tu_usuario"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="md"
                loading={savingInstagram}
                onClick={saveInstagram}
              >
                Guardar
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6 border-amber-600/20">
          <CardBody>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-bold uppercase text-xs tracking-wider">
                ¿Olvidaste la contraseña?
              </h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              Para entrar usás el email{" "}
              <strong className="text-white break-all">{user.email}</strong>. Si no te acordás
              de la contraseña, escribinos por WhatsApp desde el mismo número con el que te
              registraste y te ayudamos.
            </p>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Pedir ayuda por WhatsApp
              </a>
            ) : (
              <p className="text-gray-600 text-xs">
                Contactá a The Gamer Shop indicando tu email: {user.email}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-400" />
              <h2 className="text-white font-bold uppercase text-xs tracking-wider">
                {user.hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
              </h2>
            </div>
            <p className="text-gray-600 text-xs mb-4">
              {user.hasPassword
                ? "Elegí una nueva que solo vos conozcas."
                : "Todavía no tenés contraseña — creá una para entrar más seguro."}
            </p>

            <form onSubmit={changePassword} className="flex flex-col gap-4">
              {user.hasPassword && (
                <div className="relative">
                  <Input
                    label="Contraseña actual"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300"
                    aria-label="Mostrar contraseña"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <div className="relative">
                <Input
                  label="Contraseña nueva"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300"
                  aria-label="Mostrar contraseña"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Repetir contraseña nueva"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-[2.1rem] text-gray-500 hover:text-gray-300"
                  aria-label="Mostrar contraseña"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button type="submit" variant="primary" size="md" loading={savingPassword}>
                {user.hasPassword ? "Actualizar contraseña" : "Crear contraseña"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-gray-600 text-xs mt-6">
          <Link href="/dashboard" className="text-red-400 hover:text-red-300">
            Volver al panel
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
