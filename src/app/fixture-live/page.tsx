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
import { FixtureMatchRow, type FixtureMatch } from "@/components/fixture/FixtureMatchRow";

const REFRESH_MS = 60_000;

// Fases eliminatorias en orden, con su etiqueta.
const KNOCKOUT_PHASES: { key: string; label: string }[] = [
  { key: "ROUND_OF_32", label: "16vos de final" },
  { key: "ROUND_OF_16", label: "Octavos de final" },
  { key: "QUARTER_FINALS", label: "Cuartos de final" },
  { key: "SEMI_FINALS", label: "Semifinales" },
  { key: "THIRD_PLACE", label: "Tercer puesto" },
  { key: "FINAL", label: "Final" },
];

export default function FixtureLivePage() {
  const [groups, setGroups] = useState<FixtureGroup[]>([]);
  const [knockout, setKnockout] = useState<Record<string, FixtureMatch[]>>({});
  const [loading, setLoading] = useState(true);

  const loadFixture = useCallback(async () => {
    try {
      const [groupsRes, fixtureRes] = await Promise.all([
        fetch("/api/public/groups", { cache: "no-store" }),
        fetch("/api/public/fixture", { cache: "no-store" }),
      ]);
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
      if (fixtureRes.ok) {
        const data = await fixtureRes.json();
        const byPhase: Record<string, FixtureMatch[]> = {};
        for (const block of data.fixture || []) {
          if (block.phase === "GROUP_STAGE") continue;
          // Más recientes/próximos arriba, los ya jugados (viejos) abajo.
          byPhase[block.phase] = [...(block.matches || [])].sort((a: FixtureMatch, b: FixtureMatch) => {
            const ta = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            const tb = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            return tb - ta;
          });
        }
        setKnockout(byPhase);
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

  const liveCount =
    groups.reduce((n, g) => n + g.matches.filter((m) => m.status === "live").length, 0) +
    Object.values(knockout).reduce(
      (n, ms) => n + ms.filter((m) => m.status === "live").length,
      0
    );

  const hasKnockout = KNOCKOUT_PHASES.some((p) => (knockout[p.key]?.length ?? 0) > 0);

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
            <Badge variant="default">Grupos</Badge>
            {hasKnockout && <Badge variant="default">Eliminatorias</Badge>}
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
          <>
            {hasKnockout && (
              <div className="mb-12">
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight text-center mb-1">
                  Eliminatorias
                </h2>
                <p className="text-gray-500 text-xs text-center mb-8">
                  Llaves del mundial · se actualiza automáticamente
                </p>
                <div className="space-y-8">
                  {KNOCKOUT_PHASES.filter((p) => (knockout[p.key]?.length ?? 0) > 0).slice().reverse().map((p) => (
                    <div key={p.key}>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-black uppercase text-white tracking-wide whitespace-nowrap">
                          {p.label}
                        </h3>
                        <div className="flex-1 h-px bg-[#1f1f1f]" />
                        <span className="text-gray-600 text-xs font-bold">
                          {knockout[p.key].length} partido{knockout[p.key].length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {knockout[p.key].map((m) => (
                          <FixtureMatchRow key={m.id} match={m} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fase de grupos (ya jugada) — abajo */}
            <div>
              {hasKnockout && (
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight text-center mb-6">
                  Fase de grupos
                </h2>
              )}
              <FixtureGroupsView groups={groups} />
            </div>
          </>
        )}
        <p className="text-center text-gray-600 text-[10px] sm:text-xs mt-8 uppercase tracking-wider">
          Actualización automática · datos del prode
        </p>
      </main>

      <Footer />
    </div>
  );
}
