"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, User } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface UserMenuProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  /** En menú mobile expandido: lista vertical en lugar de dropdown */
  variant?: "dropdown" | "stacked";
  onNavigate?: () => void;
}

const MENU_WIDTH = 188;

export function UserMenu({ user, variant = "dropdown", onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setMenuPos({ top: rect.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById("user-menu-dropdown");
      if (menu?.contains(target)) return;
      setOpen(false);
    };

    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, variant, updatePosition]);

  const items = [
    { href: "/perfil", label: "Mi perfil", icon: <User className="w-4 h-4" /> },
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  if (variant === "stacked") {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center gap-2 py-1">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            seed={user.id}
            size="sm"
          />
          <span className="text-white font-medium text-sm">
            {user.firstName} {user.lastName}
          </span>
        </div>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
              pathname === item.href
                ? "bg-red-600/20 text-red-400"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  const dropdown =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id="user-menu-dropdown"
        role="menu"
        style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        className="py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl shadow-black/50 z-[200]"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              pathname === item.href
                ? "text-red-400 bg-red-600/10"
                : "text-gray-300 hover:text-white hover:bg-[#1f1f1f]"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) updatePosition();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg px-1 py-1"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          seed={user.id}
          size="sm"
        />
        <span className="font-medium">{user.firstName}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {dropdown}
    </>
  );
}
