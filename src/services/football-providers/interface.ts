export interface ProviderTeam {
  externalId: string;
  name: string;
  code: string;
  flagUrl: string;
}

export interface ProviderMatch {
  externalId: string;
  matchCode: string;
  phase: string;
  group?: string;
  homeTeamExternalId?: string;
  awayTeamExternalId?: string;
  homeName?: string;
  awayName?: string;
  venue?: string;
  startDate?: Date;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  winnerTeamExternalId?: string;
}

export interface ProviderStanding {
  group: string;
  rank: number;
  teamExternalId: string;
  teamName: string;
  teamLogo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form: string | null;
}

export interface ProviderTopScorer {
  rank: number;
  externalId: string;
  name: string;
  photo: string | null;
  teamName: string;
  teamLogo: string | null;
  goals: number;
  assists: number;
  gamesPlayed: number;
  minutesPlayed: number;
}

export interface ProviderMatchEvent {
  minute: number | null;
  extraTime: number | null;
  teamExternalId: string;
  teamName: string;
  playerName: string | null;
  assistName: string | null;
  eventType: string;
  detail: string | null;
  comments: string | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  teamsUpdated?: number;
  matchesUpdated?: number;
  errors?: string[];
}

export interface FootballDataProvider {
  name: string;
  getTeams(): Promise<ProviderTeam[]>;
  getFixtures(): Promise<ProviderMatch[]>;
  getMatchResult(matchExternalId: string): Promise<ProviderMatch | null>;
  getTodayMatches(): Promise<ProviderMatch[]>;
  getMatchesByDate(date: Date): Promise<ProviderMatch[]>;
}
