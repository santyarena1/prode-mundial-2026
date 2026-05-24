"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Trophy, LogOut, AlertTriangle, Save, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UserMenu } from "@/components/layout/UserMenu";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { StickyBackBar } from "@/components/layout/StickyBackBar";
import { shouldShowBackButton } from "@/lib/navigation";

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  email: string;
}

export function Navbar() {
  const [user, setUser] = useState<UserData | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasPendingPreds, setHasPendingPreds] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // not logged in
      }
    };
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch("/api/participant/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // ignore
      }
    };
    fetchUser();
    fetchNotifications();

    window.addEventListener("pointsUpdated", fetchUser);
    window.addEventListener("notificationsRead", fetchNotifications);
    return () => {
      window.removeEventListener("pointsUpdated", fetchUser);
      window.removeEventListener("notificationsRead", fetchNotifications);
    };
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    if (pathname !== "/predictions") {
      const pending = sessionStorage.getItem("pred_unsaved") === "1";
      setHasPendingPreds(pending);
      if (pending) setShowUnsavedModal(true);
    } else {
      setHasPendingPreds(false);
      setShowUnsavedModal(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/", label: "Inicio" },
    { href: "/fixture-live", label: "Fixture Live" },
    { href: "/ranking", label: "Ranking" },
    { href: "/como-jugar", label: "Cómo jugar" },
    ...(user ? [{ href: "/my-predictions", label: "Mis Predicciones" }] : []),
    ...(user ? [{ href: "/squads", label: "Grupos" }] : []),
  ];

  const isActive = (href: string) => pathname === href;
  const isHome = pathname === "/";
  const showBack = shouldShowBackButton(pathname) && !isHome;

  const unsavedModal = (
    <AnimatePresence>
      {showUnsavedModal && hasPendingPreds && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm"
            onClick={() => setShowUnsavedModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#111] border border-amber-500/40 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center pointer-events-auto">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-white font-black text-lg mb-2">¡Che, no guardaste!</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Tenés predicciones seleccionadas sin confirmar.{" "}
                <span className="text-amber-400 font-semibold">No van a contar hasta que las guardes.</span>
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/predictions"
                  onClick={() => setShowUnsavedModal(false)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Ir a guardar mis predicciones
                </Link>
                <button
                  onClick={() => setShowUnsavedModal(false)}
                  className="w-full py-2.5 text-gray-500 hover:text-gray-300 font-semibold text-sm transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (isHome) {
    return (
      <>
      <nav className="fixed top-0 left-0 right-0 z-50 pb-5 sm:pb-6 overflow-visible">
        <div
          aria-hidden
          className={`absolute inset-0 pointer-events-none backdrop-blur-lg transition-all duration-500 [mask-image:linear-gradient(to_bottom,black_0%,black_35%,rgba(0,0,0,0.4)_65%,transparent_100%)] ${
            scrolled
              ? "bg-gradient-to-b from-black/70 via-black/25 to-transparent"
              : "bg-gradient-to-b from-black/50 via-black/15 to-transparent"
          }`}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="flex items-center justify-between h-24 sm:h-28 overflow-visible">
            <Logo size="sm" priority />
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold uppercase tracking-wider transition-colors drop-shadow-sm ${
                    isActive(link.href) ? "text-red-400" : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3 overflow-visible">
              {user ? (
                <>
                  <UserMenu user={user} />
                  <Badge variant="points">
                    <Trophy className="w-3 h-3 mr-1" />
                    {user.totalPoints} pts
                  </Badge>
                  <Link href="/notifications" className="relative text-gray-500 hover:text-white transition-colors" title="Notificaciones">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Participar
                  </Button>
                </Link>
              )}
            </div>
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <Link href="/notifications" className="relative text-white/80 hover:text-white p-1" title="Notificaciones">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                className="text-white/90 hover:text-white p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden relative bg-black/40 backdrop-blur-xl border-t border-white/[0.06]">
            <div className="px-4 pt-3 pb-5 flex flex-col gap-3 max-w-7xl mx-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold uppercase tracking-wider py-2 border-b border-[#1a1a1a] transition-colors ${
                    isActive(link.href) ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="pt-2 space-y-3 border-t border-[#1a1a1a]">
                  <UserMenu
                    user={user}
                    variant="stacked"
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <div className="flex items-center justify-between">
                    <Badge variant="points">
                      <Trophy className="w-3 h-3 mr-1" />
                      {user.totalPoints} pts
                    </Badge>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-400">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/register">
                  <Button variant="primary" size="md" className="w-full">
                    Participar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      {unsavedModal}
      </>
    );
  }

  return (
    <>
    <header className="sticky top-0 z-50 w-full flex flex-col">
      {/* Fila principal del menú */}
      <nav className="relative w-full bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#1a1a1a]/80 overflow-visible">
        <div
          aria-hidden
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            scrolled ? "opacity-100" : "opacity-60"
          } bg-gradient-to-b from-black/40 to-transparent`}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="flex items-center justify-between min-h-[7rem] py-2 overflow-visible">
            <Logo size="md" showTagline priority />

            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isActive(link.href) ? "text-red-400" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3 overflow-visible">
              {user ? (
                <>
                  <UserMenu user={user} />
                  <Badge variant="points">
                    <Trophy className="w-3 h-3 mr-1" />
                    {user.totalPoints} pts
                  </Badge>
                  <Link href="/notifications" className="relative text-gray-500 hover:text-white transition-colors" title="Notificaciones">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Participar
                  </Button>
                </Link>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              {user && (
                <Link href="/notifications" className="relative text-white/80 hover:text-white p-1" title="Notificaciones">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                className="text-white/90 hover:text-white p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Volver — fijo debajo del navbar, con relleno y fondo opaco */}
      {showBack && <StickyBackBar />}

      {mobileOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-[#1a1a1a]">
          <div className="px-4 pt-3 pb-5 flex flex-col gap-3 max-w-7xl mx-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold uppercase tracking-wider py-2 border-b border-[#1a1a1a] transition-colors ${
                  isActive(link.href) ? "text-red-500" : "text-gray-400"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="pt-2 space-y-3 border-t border-[#1a1a1a]">
                <UserMenu
                  user={user}
                  variant="stacked"
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className="flex items-center justify-between">
                  <Badge variant="points">
                    <Trophy className="w-3 h-3 mr-1" />
                    {user.totalPoints} pts
                  </Badge>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-red-400">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/register">
                <Button variant="primary" size="md" className="w-full">
                  Participar
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
    {unsavedModal}
    </>
  );
}
