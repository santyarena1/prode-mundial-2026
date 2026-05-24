"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getBackFallback, getBackLabel, shouldShowBackButton } from "@/lib/navigation";

interface BackButtonProps {
  className?: string;
  label?: string;
  /** Forzar href si no querés usar historial */
  href?: string;
}

export function BackButton({ className = "", label, href }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const fallback = href ?? getBackFallback(pathname);
  const text = label ?? getBackLabel(pathname);

  if (!shouldShowBackButton(pathname) && !href) return null;

  const handleClick = () => {
    router.push(fallback);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors group ${className}`}
      aria-label={text}
    >
      <span className="w-8 h-8 rounded-lg border border-[#333] bg-[#111] flex items-center justify-center group-hover:border-red-600/50 group-hover:bg-red-950/30 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </span>
      <span className="text-xs sm:text-sm max-w-[7rem] sm:max-w-none truncate">{text}</span>
    </button>
  );
}
