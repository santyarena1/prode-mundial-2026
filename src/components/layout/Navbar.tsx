"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Trophy, LogOut } from "lucide-react";
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
    fetchUser();
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
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
  ];

  const isActive = (href: string) => pathname === href;
  const isHome = pathname === "/";
  const showBack = shouldShowBackButton(pathname) && !isHome;

  if (isHome) {
    return (
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
          <div className="flex items-center justify-between h-14 sm:h-16 overflow-visible">
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
            <button
              className="md:hidden text-white/90 hover:text-white p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
    );
  }

  return (
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
          <div className="flex items-center justify-between min-h-[4rem] py-1.5 overflow-visible">
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

            <button
              className="md:hidden text-white/90 hover:text-white p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
  );
}
