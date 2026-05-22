/**
 * API-Football provider (api-sports.io)
 * Pro plan: 7500 requests/day
 * Headers: x-apisports-key
 * Base URL: https://v3.football.api-sports.io
 *
 * World Cup 2026: league_id=1 (FIFA World Cup), season=2026
 */

import type { FootballDataProvider, ProviderTeam, ProviderMatch, ProviderStanding, ProviderTopScorer, ProviderMatchEvent } from "./interface";

const TEAM_NAMES_ES: Record<string, string> = {
  "United States":          "Estados Unidos",
  "USA":                    "Estados Unidos",
  "Mexico":                 "México",
  "Canada":                 "Canadá",
  "Honduras":               "Honduras",
  "Brazil":                 "Brasil",
  "Serbia":                 "Serbia",
  "Switzerland":            "Suiza",
  "Cameroon":               "Camerún",
  "Argentina":              "Argentina",
  "Croatia":                "Croacia",
  "Morocco":                "Marruecos",
  "Slovakia":               "Eslovaquia",
  "France":                 "Francia",
  "Poland":                 "Polonia",
  "Australia":              "Australia",
  "Tunisia":                "Túnez",
  "Spain":                  "España",
  "Japan":                  "Japón",
  "Costa Rica":             "Costa Rica",
  "Senegal":                "Senegal",
  "Germany":                "Alemania",
  "Portugal":               "Portugal",
  "Colombia":               "Colombia",
  "South Korea":            "Corea del Sur",
  "Korea Republic":         "Corea del Sur",
  "Netherlands":            "Países Bajos",
  "Ecuador":                "Ecuador",
  "Qatar":                  "Catar",
  "Ghana":                  "Ghana",
  "England":                "Inglaterra",
  "Iran":                   "Irán",
  "Uruguay":                "Uruguay",
  "Algeria":                "Argelia",
  "Italy":                  "Italia",
  "Chile":                  "Chile",
  "Nigeria":                "Nigeria",
  "New Zealand":            "Nueva Zelanda",
  "Belgium":                "Bélgica",
  "Denmark":                "Dinamarca",
  "Paraguay":               "Paraguay",
  "Egypt":                  "Egipto",
  "Ukraine":                "Ucrania",
  "Peru":                   "Perú",
  "Ivory Coast":            "Costa de Marfil",
  "Cote d'Ivoire":          "Costa de Marfil",
  "Indonesia":              "Indonesia",
  "Turkey":                 "Turquía",
  "Türkiye":                "Turquía",
  "Venezuela":              "Venezuela",
  "Saudi Arabia":           "Arabia Saudita",
  "Panama":                 "Panamá",
  "Scotland":               "Escocia",
  "Wales":                  "Gales",
  "Austria":                "Austria",
  "Hungary":                "Hungría",
  "Czech Republic":         "República Checa",
  "Romania":                "Rumania",
  "Greece":                 "Grecia",
  "Sweden":                 "Suecia",
  "Norway":                 "Noruega",
  "Finland":                "Finlandia",
  "Russia":                 "Rusia",
  "China":                  "China",
  "India":                  "India",
  "Bolivia":                "Bolivia",
  "Guatemala":              "Guatemala",
  "El Salvador":            "El Salvador",
  "Nicaragua":              "Nicaragua",
  "Cuba":                   "Cuba",
  "Haiti":                  "Haití",
  "Jamaica":                "Jamaica",
  "Trinidad and Tobago":    "Trinidad y Tobago",
  "Iceland":                "Islandia",
  "Iraq":                   "Irak",
  "Jordan":                 "Jordania",
  "Lebanon":                "Líbano",
  "Oman":                   "Omán",
  "United Arab Emirates":   "Emiratos Árabes Unidos",
  "Kuwait":                 "Kuwait",
  "Bahrain":                "Baréin",
  "South Africa":           "Sudáfrica",
  "Bosnia & Herzegovina":   "Bosnia y Herzegovina",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Curaçao":                "Curazao",
  "Cape Verde Islands":     "Cabo Verde",
  "Cape Verde":             "Cabo Verde",
  "Congo DR":               "Congo RD",
  "DR Congo":               "Congo RD",
  "Uzbekistan":             "Uzbekistán",
  "Albania":                "Albania",
  "Slovenia":               "Eslovenia",
  "North Macedonia":        "Macedonia del Norte",
  "Israel":                 "Israel",
  "Kosovo":                 "Kosovo",
  "Lithuania":              "Lituania",
  "Latvia":                 "Letonia",
  "Estonia":                "Estonia",
  "Georgia":                "Georgia",
  "Armenia":                "Armenia",
  "Azerbaijan":             "Azerbaiyán",
  "Kazakhstan":             "Kazajistán",
  "Kyrgyzstan":             "Kirguistán",
  "Tajikistan":             "Tayikistán",
  "Turkmenistan":           "Turkmenistán",
  "Mongolia":               "Mongolia",
  "Vietnam":                "Vietnam",
  "Thailand":               "Tailandia",
  "Malaysia":               "Malasia",
  "Philippines":            "Filipinas",
  "Myanmar":                "Birmania",
  "Cambodia":               "Camboya",
  "Palestine":              "Palestina",
  "Syria":                  "Siria",
  "Yemen":                  "Yemen",
  "Libya":                  "Libia",
  "Sudan":                  "Sudán",
  "Ethiopia":               "Etiopía",
  "Kenya":                  "Kenia",
  "Tanzania":               "Tanzania",
  "Uganda":                 "Uganda",
  "Zambia":                 "Zambia",
  "Zimbabwe":               "Zimbabue",
  "Mozambique":             "Mozambique",
  "Madagascar":             "Madagascar",
  "Angola":                 "Angola",
  "Burkina Faso":           "Burkina Faso",
  "Mali":                   "Mali",
  "Mauritania":             "Mauritania",
  "Benin":                  "Benín",
  "Guinea":                 "Guinea",
  "Guinea-Bissau":          "Guinea-Bisáu",
  "Equatorial Guinea":      "Guinea Ecuatorial",
  "Liberia":                "Liberia",
  "Sierra Leone":           "Sierra Leona",
  "Gambia":                 "Gambia",
  "Togo":                   "Togo",
  "Gabon":                  "Gabón",
  "Congo":                  "Congo",
  "Rwanda":                 "Ruanda",
  "Burundi":                "Burundi",
  "Malawi":                 "Malaui",
  "Namibia":                "Namibia",
  "Botswana":               "Botsuana",
  "Lesotho":                "Lesoto",
  "Eswatini":               "Esuatini",
  "Comoros":                "Comoras",
  "Sao Tome and Principe":  "Santo Tomé y Príncipe",
  "Seychelles":             "Seychelles",
  "Djibouti":               "Yibuti",
  "Somalia":                "Somalia",
  "Eritrea":                "Eritrea",
  "Dominican Republic":     "República Dominicana",
  "Belize":                 "Belice",
  "Barbados":               "Barbados",
  "Guyana":                 "Guyana",
  "Suriname":               "Surinam",
};

function translateTeamName(name: string): string {
  return TEAM_NAMES_ES[name] || name;
}

const BASE_URL = process.env.FOOTBALL_API_BASE_URL || "https://v3.football.api-sports.io";
const API_KEY = process.env.FOOTBALL_API_KEY || "";
const LEAGUE_ID = process.env.FOOTBALL_COMPETITION_ID || "1";
const SEASON = process.env.FOOTBALL_SEASON || "2026";

function mapRound(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("group")) return "GROUP_STAGE";
  if (r.includes("round of 32") || r.includes("1/16")) return "ROUND_OF_32";
  if (r.includes("round of 16") || r.includes("1/8") || r.includes("last 16")) return "ROUND_OF_16";
  if (r.includes("quarter")) return "QUARTER_FINALS";
  if (r.includes("semi")) return "SEMI_FINALS";
  if (r.includes("3rd") || r.includes("third") || r.includes("place")) return "THIRD_PLACE";
  if (r.includes("final")) return "FINAL";
  return "GROUP_STAGE";
}

function mapStatus(s: string): ProviderMatch["status"] {
  const status = s.toUpperCase();
  if (["NS", "TBD", "PST", "SUSP", "INT", "CANC"].includes(status)) {
    if (status === "CANC") return "cancelled";
    if (status === "PST") return "postponed";
    return "scheduled";
  }
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(status)) return "live";
  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  return "scheduled";
}

// macOS LibreSSL/Cloudflare TLS incompatibility workaround.
async function apiFetch(endpoint: string) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": API_KEY, "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0)
      throw new Error(`API error: ${JSON.stringify(data.errors)}`);
    return data.response;
  } catch (err: any) {
    if (err.cause?.code !== "ECONNRESET" && err.message !== "fetch failed") throw err;
  }

  // Fallback: brew curl (macOS dev only)
  const { execSync } = await import("child_process");
  const curlBin = process.env.CURL_BIN || "/opt/homebrew/opt/curl/bin/curl";
  const cmd = `${curlBin} -s -H "x-apisports-key: ${API_KEY}" -H "Accept: application/json" "${url}"`;
  const raw = execSync(cmd, { timeout: 15000 }).toString();
  const data = JSON.parse(raw);
  if (data.errors && Object.keys(data.errors).length > 0)
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  return data.response;
}

// externalId → FIFA 3-letter code (for teams where API code is null or collides)
const EXTERNAL_ID_TO_CODE: Record<string, string> = {
  "16":   "MEX", "1531": "RSA", "17":   "KOR", "770":  "CZE",
  "5529": "CAN", "1113": "BIH", "1569": "QAT", "15":   "SUI",
  "6":    "BRA", "31":   "MAR", "2386": "HAI", "1108": "SCO",
  "2384": "USA", "2380": "PAR", "20":   "AUS", "777":  "TUR",
  "25":   "GER", "5530": "CUW", "1501": "CIV", "2382": "ECU",
  "1118": "NED", "12":   "JPN", "5":    "SWE", "28":   "TUN",
  "1":    "BEL", "32":   "EGY", "22":   "IRN", "4673": "NZL",
  "9":    "ESP", "1533": "CPV", "23":   "KSA", "7":    "URU",
  "2":    "FRA", "13":   "SEN", "1567": "IRQ", "1090": "NOR",
  "26":   "ARG", "1532": "ALG", "775":  "AUT", "1548": "JOR",
  "27":   "POR", "1508": "COD", "1568": "UZB", "8":    "COL",
  "10":   "ENG", "3":    "CRO", "1504": "GHA", "11":   "PAN",
};

export interface TeamWithGroup {
  externalId: string;
  name: string;
  code: string;
  logoUrl: string;
  groupName: string; // "A", "B", ... "L"
}

export class ApiFootballProvider implements FootballDataProvider {
  name = "api-football";

  async getTeams(): Promise<ProviderTeam[]> {
    const { teams } = await this.getTeamsWithGroups();
    return teams;
  }

  // Fetches teams + group assignments from standings endpoint (authoritative source)
  async getTeamsWithGroups(): Promise<{ teams: ProviderTeam[]; teamGroups: Record<string, string> }> {
    const data = await apiFetch(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
    if (!data || data.length === 0) return { teams: [], teamGroups: {} };

    const standings = data[0]?.league?.standings || [];
    const teams: ProviderTeam[] = [];
    const teamGroups: Record<string, string> = {}; // externalId → groupName

    for (const groupStandings of standings) {
      if (!groupStandings || groupStandings.length === 0) continue;
      // "Group A" → "A"
      const groupName = (groupStandings[0]?.group || "").replace(/^Group\s+/i, "").trim();

      for (const entry of groupStandings) {
        const team = entry.team;
        const externalId = String(team.id);
        teamGroups[externalId] = groupName;
        const code = EXTERNAL_ID_TO_CODE[externalId]
          || (team.code && team.code.length >= 2 ? team.code : null)
          || team.name.slice(0, 3).toUpperCase();
        teams.push({
          externalId,
          name: translateTeamName(team.name),
          code,
          flagUrl: team.logo || "",
        });
      }
    }

    return { teams, teamGroups };
  }

  async getFixtures(): Promise<ProviderMatch[]> {
    const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    return this._mapFixtures(data || []);
  }

  async getMatchResult(matchExternalId: string): Promise<ProviderMatch | null> {
    const data = await apiFetch(`/fixtures?id=${matchExternalId}`);
    if (!data || data.length === 0) return null;
    return this._mapFixtures(data)[0] || null;
  }

  async getTodayMatches(): Promise<ProviderMatch[]> {
    const today = new Date().toISOString().split("T")[0];
    const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&date=${today}`);
    return this._mapFixtures(data || []);
  }

  async getMatchesByDate(date: Date): Promise<ProviderMatch[]> {
    const dateStr = date.toISOString().split("T")[0];
    const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&date=${dateStr}`);
    return this._mapFixtures(data || []);
  }

  async getLiveMatches(): Promise<ProviderMatch[]> {
    const data = await apiFetch(`/fixtures?live=all&league=${LEAGUE_ID}`);
    return this._mapFixtures(data || []);
  }

  async getStandings(): Promise<ProviderStanding[]> {
    const data = await apiFetch(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
    if (!data || data.length === 0) return [];

    const standings = data[0]?.league?.standings || [];
    const result: ProviderStanding[] = [];

    for (const groupStandings of standings) {
      if (!groupStandings) continue;
      const groupName = (groupStandings[0]?.group || "").replace(/^Group\s+/i, "").trim();

      for (const entry of groupStandings) {
        result.push({
          group: groupName,
          rank: entry.rank,
          teamExternalId: String(entry.team.id),
          teamName: translateTeamName(entry.team.name),
          teamLogo: entry.team.logo || "",
          points: entry.points || 0,
          played: entry.all?.played || 0,
          won: entry.all?.win || 0,
          drawn: entry.all?.draw || 0,
          lost: entry.all?.lose || 0,
          goalsFor: entry.all?.goals?.for || 0,
          goalsAgainst: entry.all?.goals?.against || 0,
          goalsDiff: entry.goalsDiff || 0,
          form: entry.form || null,
        });
      }
    }

    return result;
  }

  async getTopScorers(): Promise<ProviderTopScorer[]> {
    const data = await apiFetch(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`);
    if (!data) return [];

    return data.map((item: any, index: number) => ({
      rank: index + 1,
      externalId: String(item.player.id),
      name: item.player.name,
      photo: item.player.photo || null,
      teamName: translateTeamName(item.statistics?.[0]?.team?.name || ""),
      teamLogo: item.statistics?.[0]?.team?.logo || null,
      goals: item.statistics?.[0]?.goals?.total || 0,
      assists: item.statistics?.[0]?.goals?.assists || 0,
      gamesPlayed: item.statistics?.[0]?.games?.appearences || 0,
      minutesPlayed: item.statistics?.[0]?.games?.minutes || 0,
    }));
  }

  async getMatchEvents(fixtureId: string): Promise<ProviderMatchEvent[]> {
    const data = await apiFetch(`/fixtures/events?fixture=${fixtureId}`);
    if (!data) return [];

    return data.map((e: any) => ({
      minute: e.time?.elapsed ?? null,
      extraTime: e.time?.extra ?? null,
      teamExternalId: String(e.team?.id || ""),
      teamName: translateTeamName(e.team?.name || ""),
      playerName: e.player?.name || null,
      assistName: e.assist?.name || null,
      eventType: e.type || "",
      detail: e.detail || null,
      comments: e.comments || null,
    }));
  }

  private _mapFixtures(data: any[]): ProviderMatch[] {
    return data.map((item: any) => {
      const fix = item.fixture;
      const teams = item.teams;
      const goals = item.goals;
      const league = item.league;

      const homeScore = goals?.home ?? undefined;
      const awayScore = goals?.away ?? undefined;
      const status = mapStatus(fix.status?.short || "NS");

      let realOutcome: string | undefined;
      let winnerExternalId: string | undefined;

      if (status === "finished" && homeScore !== undefined && awayScore !== undefined) {
        if (homeScore > awayScore) {
          realOutcome = "HOME_WIN";
          winnerExternalId = String(teams.home.id);
        } else if (awayScore > homeScore) {
          realOutcome = "AWAY_WIN";
          winnerExternalId = String(teams.away.id);
        } else {
          realOutcome = "DRAW";
        }
      }

      return {
        externalId: String(fix.id),
        matchCode: `API-${fix.id}`,
        phase: mapRound(league?.round || "Group Stage"),
        homeTeamExternalId: String(teams.home.id),
        awayTeamExternalId: String(teams.away.id),
        homeName: translateTeamName(teams.home.name),
        awayName: translateTeamName(teams.away.name),
        venue: fix.venue?.name,
        startDate: fix.date ? new Date(fix.date) : undefined,
        homeScore: homeScore !== null ? homeScore : undefined,
        awayScore: awayScore !== null ? awayScore : undefined,
        status,
        winnerTeamExternalId: winnerExternalId,
      };
    });
  }
}
