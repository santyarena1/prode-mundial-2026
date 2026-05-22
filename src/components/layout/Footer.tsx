import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start px-2 py-1">
            <Logo size="sm" showTagline />
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-gray-500 hover:text-gray-300 text-xs uppercase tracking-wider transition-colors">
              Bases y condiciones
            </Link>
            <Link href="/fixture-live" className="text-gray-500 hover:text-red-400 text-xs uppercase tracking-wider transition-colors">
              Fixture Live
            </Link>
            <Link href="/ranking" className="text-gray-500 hover:text-gray-300 text-xs uppercase tracking-wider transition-colors">
              Ranking
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-300 text-xs uppercase tracking-wider transition-colors">
              Contacto
            </Link>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-[#1a1a1a] text-center">
          <p className="text-gray-700 text-xs">
            © 2026 The Gamer Shop. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
