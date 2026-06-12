"use client";

import { useState } from "react";
import { Radio, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMatchDate, matchStatusLabel, matchStatusVariant } from "@/lib/match-utils";

export interface FixtureTeam {
  id: string;
  name: string;
  code: string;
  flagUrl?: string | null;
}

export interface MatchEvent {
  id: string;
  minute?: number | null;
  extraTime?: number | null;
  teamId?: string | null;
  teamName?: string | null;
  playerName?: string | null;
  assistName?: string | null;
  eventType: string;
  detail?: string | null;
}

export interface FixtureMatch {
  id: string;
  matchCode: string;
  status: string;
  startDate?: string | null;
  venue?: string | null;
  homeTeam?: FixtureTeam | null;
  awayTeam?: FixtureTeam | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  events?: MatchEvent[];
}

interface FixtureMatchRowProps {
  match: FixtureMatch;
}

function TeamFlag({ team }: { team?: FixtureTeam | null }) {
  if (team?.flagUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.flagUrl}
        alt=""
        className="w-8 h-6 sm:w-9 sm:h-7 object-cover rounded-sm border border-white/10 shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-6 sm:w-9 sm:h-7 bg-[#222] rounded-sm border border-[#333] shrink-0" />
  );
}

function HomeTeam({
  team,
  placeholder,
}: {
  team?: FixtureTeam | null;
  placeholder?: string | null;
}) {
  const name = team?.name || placeholder || "Por definir";

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-self-start w-full">
      <TeamFlag team={team} />
      <div className="min-w-0 text-left">
        <p className="text-white font-bold text-sm sm:text-base leading-tight break-words line-clamp-2">{name}</p>
        {team?.code && (
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">{team.code}</p>
        )}
      </div>
    </div>
  );
}

function AwayTeam({
  team,
  placeholder,
}: {
  team?: FixtureTeam | null;
  placeholder?: string | null;
}) {
  const name = team?.name || placeholder || "Por definir";

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-self-end w-full flex-row-reverse">
      <TeamFlag team={team} />
      <div className="min-w-0 text-right">
        <p className="text-white font-bold text-sm sm:text-base leading-tight break-words line-clamp-2">{name}</p>
        {team?.code && (
          <p className="text-gray-600 text-[10px] uppercase tracking-wider">{team.code}</p>
        )}
      </div>
    </div>
  );
}

function eventIcon(eventType: string, detail?: string | null) {
  const t = eventType.toLowerCase();
  const d = (detail ?? "").toLowerCase();
  if (t === "goal") {
    if (d.includes("own goal")) return "⚽🔴";
    if (d.includes("penalty")) return "⚽🎯";
    return "⚽";
  }
  if (t === "card") {
    if (d.includes("red")) return "🟥";
    if (d.includes("yellow card - second yellow")) return "🟨🟥";
    return "🟨";
  }
  if (t === "subst") return "🔄";
  return "•";
}

function EventsPanel({ events, homeTeam, awayTeam }: {
  events: MatchEvent[];
  homeTeam?: FixtureTeam | null;
  awayTeam?: FixtureTeam | null;
}) {
  const relevant = events.filter(e => {
    const t = e.eventType.toLowerCase();
    return t === "goal" || t === "card";
  });
  if (relevant.length === 0) return (
    <p className="text-center text-gray-600 text-xs py-2">Sin eventos registrados</p>
  );

  const homeId = homeTeam?.id;
  const awayId = awayTeam?.id;

  return (
    <div className="space-y-1">
      {relevant.map(e => {
        const isHome = !!homeId && e.teamId === homeId;
        const isAway = !!awayId && e.teamId === awayId;
        const side = isHome ? "home" : isAway ? "away" : null;
        if (side === null) return null; // skip unattributed events
        const min = e.minute != null
          ? e.extraTime ? `${e.minute}+${e.extraTime}'` : `${e.minute}'`
          : null;

        return (
          <div
            key={e.id}
            className={`flex items-center gap-2 text-xs ${side === "away" ? "flex-row-reverse" : ""}`}
          >
            <span className="text-gray-500 tabular-nums w-10 shrink-0 text-center">{min ?? "—"}</span>
            <span className="text-base leading-none">{eventIcon(e.eventType, e.detail)}</span>
            <span className="text-gray-300 truncate">{e.playerName ?? e.teamName ?? "—"}</span>
            {e.assistName && <span className="text-gray-600 truncate">({e.assistName})</span>}
          </div>
        );
      })}
    </div>
  );
}

export function FixtureMatchRow({ match }: FixtureMatchRowProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore =
    isFinished || isLive
      ? match.homeScore != null && match.awayScore != null
      : false;
  const hasEvents = (match.events ?? []).filter(e => {
    const t = e.eventType.toLowerCase();
    return t === "goal" || t === "card";
  }).length > 0;
  const [expanded, setExpanded] = useState(isLive);

  return (
    <article
      className={`relative rounded-xl border bg-[#121212] transition-colors ${
        isLive
          ? "border-red-500/50 shadow-[0_0_24px_-8px_rgba(239,68,68,0.45)]"
          : "border-[#222] hover:border-[#333]"
      }`}
    >
      {isLive && (
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
          <Badge variant="error" className="gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE
          </Badge>
        </span>
      )}

      <div className="px-3 py-3 sm:px-4 sm:py-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-4 gap-y-2">
        <HomeTeam team={match.homeTeam} placeholder={match.homePlaceholder} />

        <div className="flex flex-col items-center justify-center px-1 sm:px-2 justify-self-center">
          {hasScore ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {match.homeScore}
              </span>
              <span className="text-gray-600 font-bold">:</span>
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {match.awayScore}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              vs
            </span>
          )}
          <time className="text-gray-500 text-[10px] sm:text-xs mt-1 text-center capitalize whitespace-nowrap">
            {formatMatchDate(match.startDate ?? undefined)}
          </time>
          {!isLive && (
            <Badge variant={matchStatusVariant(match.status)} className="mt-1.5 text-[9px]">
              {matchStatusLabel(match.status)}
            </Badge>
          )}
        </div>

        <AwayTeam team={match.awayTeam} placeholder={match.awayPlaceholder} />
      </div>

      {match.venue && (
        <p className="text-center text-gray-600 text-[10px] pb-2 px-4 truncate">{match.venue}</p>
      )}

      {/* Events toggle */}
      {(isFinished || isLive) && hasEvents && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-2 border-t border-[#1e1e1e] text-gray-500 hover:text-gray-300 text-[11px] uppercase tracking-wider transition-colors"
        >
          {expanded ? "Ocultar" : "Goles y tarjetas"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
      {(isFinished || isLive) && expanded && (
        <div className="px-4 py-3 border-t border-[#1a1a1a]">
          <EventsPanel
            events={match.events ?? []}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
          />
        </div>
      )}
    </article>
  );
}
