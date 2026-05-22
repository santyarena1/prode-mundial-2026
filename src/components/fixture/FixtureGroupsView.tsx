"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FixtureMatchRow, type FixtureMatch } from "@/components/fixture/FixtureMatchRow";

export interface FixtureGroup {
  id: string;
  name: string;
  teams: { id: string; name: string; code: string; flagUrl?: string | null }[];
  matches: FixtureMatch[];
}

type FilterKey = "all" | "live" | "upcoming" | "finished";

interface FixtureGroupsViewProps {
  groups: FixtureGroup[];
}

function filterMatches(matches: FixtureMatch[], filter: FilterKey) {
  const now = Date.now();
  switch (filter) {
    case "live":
      return matches.filter((m) => m.status === "live");
    case "finished":
      return matches.filter((m) => m.status === "finished");
    case "upcoming":
      return matches.filter(
        (m) =>
          m.status !== "finished" &&
          m.status !== "live" &&
          (!m.startDate || new Date(m.startDate).getTime() >= now)
      );
    default:
      return matches;
  }
}

export function FixtureGroupsView({ groups }: FixtureGroupsViewProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.id] = true;
    return init;
  });

  const visibleGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        matches: filterMatches(g.matches, filter),
      }))
      .filter((g) => g.matches.length > 0);
  }, [groups, filter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "live", label: "En vivo" },
    { key: "upcoming", label: "Próximos" },
    { key: "finished", label: "Finalizados" },
  ];

  if (groups.length === 0) {
    return (
      <p className="text-center text-gray-500 py-16">
        Todavía no hay partidos cargados. El admin puede sincronizar el fixture.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
              filter === f.key
                ? "bg-red-600 border-red-500 text-white"
                : "bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-red-600/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay partidos con este filtro.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
          {visibleGroups.map((group, gi) => (
            <motion.section
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.03 }}
              className="bg-[#111] border border-[#222] rounded-xl overflow-hidden"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-[#161616] transition-colors text-left"
                onClick={() =>
                  setExpanded((p) => ({ ...p, [group.id]: !p[group.id] }))
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                    {group.name}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-white font-black uppercase tracking-wide text-sm sm:text-base">
                      Grupo {group.name}
                    </h2>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {group.teams.map((t) =>
                        t.flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={t.id}
                            src={t.flagUrl}
                            alt={t.name}
                            title={t.name}
                            className="w-5 h-4 object-cover rounded-sm border border-white/10"
                          />
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-600 text-xs font-semibold">
                    {group.matches.length} partido{group.matches.length !== 1 ? "s" : ""}
                  </span>
                  {expanded[group.id] ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {expanded[group.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-[#1d1d1d]"
                  >
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {group.matches.map((match) => (
                        <FixtureMatchRow key={match.id} match={match} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
