"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Radio, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { FixtureGroupsView, type FixtureGroup } from "@/components/fixture/FixtureGroupsView";

const REFRESH_MS = 60_000;

export default function FixtureLivePage() {
  const [groups, setGroups] = useState<FixtureGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFixture = useCallback(async () => {
    try {
      const res = await fetch("/api/public/groups", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFixture();
    const id = setInterval(loadFixture, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadFixture]);

  const liveCount = groups.reduce(
    (n, g) => n + g.matches.filter((m) => m.status === "live").length,
    0
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <section className="relative border-b border-[#1a1a1a] overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-70 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-red-600/10 blur-[100px] pointer-events-none" />
        <motion.div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 mb-4 flex-wrap justify-center">
            {liveCount > 0 ? (
              <Badge variant="error" className="animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                {liveCount} en vivo
              </Badge>
            ) : (
              <Badge variant="default">
                <CalendarDays className="w-3 h-3 mr-1" />
                Fixture
              </Badge>
            )}
            <Badge variant="default">Fase de grupos</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
            Fixture <span className="neon-red">Live</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-3 max-w-xl mx-auto">
            Partidos del mundial organizados por grupo. Se actualiza automáticamente cada minuto.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link href="/predictions">
              <Button variant="primary" size="sm">
                Cargar predicciones
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/ranking">
              <Button variant="secondary" size="sm">
                Ver ranking
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingScreen text="Cargando fixture..." />
        ) : (
          <FixtureGroupsView groups={groups} />
        )}
        <p className="text-center text-gray-600 text-[10px] sm:text-xs mt-8 uppercase tracking-wider">
          Actualización automática · datos del prode
        </p>
      </main>

      <Footer />
    </div>
  );
}
