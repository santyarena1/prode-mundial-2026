"use client";

import { BackButton } from "@/components/layout/BackButton";

/** Barra fija debajo del navbar — fondo sólido para no tapar el contenido al scrollear */
export function StickyBackBar() {
  return (
    <div className="w-full bg-[#0a0a0a]/98 backdrop-blur-md border-t border-[#1a1a1a] border-b border-[#1a1a1a] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.85)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <BackButton />
      </div>
    </div>
  );
}
