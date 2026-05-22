"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface RankingUser {
  position: number;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

const positionBadge = (pos: number): "gold" | "silver" | "bronze" | "position" => {
  if (pos === 1) return "gold";
  if (pos === 2) return "silver";
  if (pos === 3) return "bronze";
  return "position";
};

const positionEmoji = (pos: number) => {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `#${pos}`;
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/public/ranking")
      .then((r) => r.json())
      .then((data) => setRanking(data.ranking || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return ranking;
    const q = search.toLowerCase();
    return ranking.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)
    );
  }, [ranking, search]);

  const maxPoints = ranking[0]?.totalPoints || 1;

  if (loading) return <LoadingScreen text="Cargando ranking..." />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-white">
            RANKING <span className="text-red-500">GENERAL</span>
          </h1>
          <p className="text-gray-500 mt-1">{ranking.length} participantes</p>
        </div>

        {/* Top 3 podium */}
        {ranking.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* 2nd */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <Card className="p-4 text-center border-gray-500/30">
                <div className="text-2xl mb-1">🥈</div>
                <div className="w-12 h-12 bg-gray-700/30 border border-gray-600/50 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold text-gray-300">
                  {ranking[1].firstName[0]}{ranking[1].lastName[0]}
                </div>
                <div className="text-white font-bold text-xs leading-tight break-all line-clamp-1">{ranking[1].firstName}</div>
                <div className="text-gray-500 text-[10px] leading-tight break-all line-clamp-1">{ranking[1].lastName}</div>
                <div className="text-gray-300 font-black text-lg mt-1">{ranking[1].totalPoints}</div>
                <div className="text-gray-600 text-xs">pts</div>
              </Card>
            </motion.div>

            {/* 1st */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card glow className="p-4 text-center">
                <div className="text-2xl mb-1">🥇</div>
                <div className="w-14 h-14 bg-yellow-600/20 border border-yellow-500/50 rounded-full flex items-center justify-center mx-auto mb-2 text-base font-bold text-yellow-300">
                  {ranking[0].firstName[0]}{ranking[0].lastName[0]}
                </div>
                <div className="text-white font-bold text-sm leading-tight break-all line-clamp-1">{ranking[0].firstName}</div>
                <div className="text-gray-400 text-xs leading-tight break-all line-clamp-1">{ranking[0].lastName}</div>
                <div className="text-yellow-400 font-black text-2xl mt-1">{ranking[0].totalPoints}</div>
                <div className="text-gray-500 text-xs">pts</div>
              </Card>
            </motion.div>

            {/* 3rd */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10"
            >
              <Card className="p-4 text-center border-orange-600/20">
                <div className="text-2xl mb-1">🥉</div>
                <div className="w-12 h-12 bg-orange-900/20 border border-orange-600/30 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold text-orange-400">
                  {ranking[2].firstName[0]}{ranking[2].lastName[0]}
                </div>
                <div className="text-white font-bold text-xs leading-tight break-all line-clamp-1">{ranking[2].firstName}</div>
                <div className="text-gray-500 text-[10px] leading-tight break-all line-clamp-1">{ranking[2].lastName}</div>
                <div className="text-orange-400 font-black text-lg mt-1">{ranking[2].totalPoints}</div>
                <div className="text-gray-600 text-xs">pts</div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Full table */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No hay resultados para tu búsqueda.</p>
            </Card>
          )}
          {filtered.map((user, i) => (
            <motion.div
              key={`${user.firstName}-${user.position}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card
                className={`p-4 transition-colors hover:bg-[#151515] ${
                  user.position <= 3 ? "border-[#2a2a2a]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 text-center">
                    {user.position <= 3 ? (
                      <span className="text-lg">{positionEmoji(user.position)}</span>
                    ) : (
                      <Badge variant={positionBadge(user.position)} className="text-xs">
                        #{user.position}
                      </Badge>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full mt-1.5 max-w-[200px]">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all"
                        style={{ width: `${(user.totalPoints / maxPoints) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-yellow-400 font-black">
                    <Medal className="w-4 h-4" />
                    <span>{user.totalPoints}</span>
                    <span className="text-gray-600 font-normal text-xs">pts</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
