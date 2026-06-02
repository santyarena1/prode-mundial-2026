"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Calendar, CheckSquare, Trophy, Gift, Zap,
  Building2, RefreshCw, Settings, LogOut, Menu, X, ChevronRight, BookOpen, Handshake, Shuffle, Swords, Mail, MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { StickyBackBar } from "@/components/layout/StickyBackBar";
import { shouldShowBackButton } from "@/lib/navigation";

type NavItem = { href: string; icon: React.ElementType; label: string };
type NavSection = { section: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    section: "",
    items: [
      { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    section: "Torneo",
    items: [
      { href: "/admin/participants", icon: Users, label: "Participantes" },
      { href: "/admin/fixture", icon: Calendar, label: "Fixture" },
      { href: "/admin/results", icon: CheckSquare, label: "Resultados" },
      { href: "/admin/ranking", icon: Trophy, label: "Ranking" },
    ],
  },
  {
    section: "Premios & Puntos",
    items: [
      { href: "/admin/prizes", icon: Gift, label: "Premios" },
      { href: "/admin/bonus", icon: Zap, label: "Bonus" },
      { href: "/admin/raffles", icon: Shuffle, label: "Sorteos semanales" },
    ],
  },
  {
    section: "Contenido",
    items: [
      { href: "/admin/virtual-album", icon: BookOpen, label: "Álbum virtual" },
      { href: "/admin/squads", icon: Swords, label: "Grupos" },
    ],
  },
  {
    section: "Comercial",
    items: [
      { href: "/admin/sponsors", icon: Building2, label: "Sponsors" },
      { href: "/admin/sponsor-inquiries", icon: Handshake, label: "Consultas sponsors" },
    ],
  },
  {
    section: "Comunicación",
    items: [
      { href: "/admin/communications", icon: Mail, label: "Comunicaciones" },
      { href: "/admin/contacto", icon: MessageSquare, label: "Mensajes de contacto" },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/admin/sync", icon: RefreshCw, label: "Sincronización" },
      { href: "/admin/settings", icon: Settings, label: "Configuración" },
    ],
  },
];

// Flat list for active label lookup
const navItems = navSections.flatMap(s => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setAdminChecked(true);
      return;
    }
    fetch("/api/admin/auth/me", { credentials: "include" }).then((r) => {
      if (!r.ok) router.replace("/admin/login");
      else setAdminChecked(true);
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;
  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-auto lg:h-full lg:flex-shrink-0`}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#1a1a1a]">
          <Logo size="sm" href="/admin/dashboard" />
          <div className="text-gray-600 text-xs uppercase tracking-wider mt-3 pl-1">
            Admin Panel
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {navSections.map((section) => (
            <div key={section.section}>
              {section.section && (
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-700">
                  {section.section}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, icon: Icon, label }) => {
                  const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href + "/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-red-600/15 text-red-400 border border-red-600/20"
                          : "text-gray-500 hover:text-gray-200 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#1a1a1a]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-900/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex flex-col shrink-0 bg-[#0d0d0d]">
          <div className="h-14 border-b border-[#1a1a1a] flex items-center px-4 gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-white shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-sm uppercase tracking-wider">
                {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label || "Admin Panel"}
              </h1>
            </div>
            <div className="text-xs text-gray-600 hidden sm:block">
              Prode Mundial Gamer 2026
            </div>
          </div>
          {shouldShowBackButton(pathname) && <StickyBackBar />}
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
