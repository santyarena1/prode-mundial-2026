// Maps FIFA/common 3-letter codes → ISO 3166-1 alpha-2 for flagcdn.com
const FIFA_TO_ISO2: Record<string, string> = {
  ARG: "ar", BRA: "br", FRA: "fr", GER: "de", ESP: "es",
  POR: "pt", NED: "nl", ITA: "it", BEL: "be", URU: "uy",
  COL: "co", CHI: "cl", MEX: "mx", USA: "us", CAN: "ca",
  JPN: "jp", KOR: "kr", AUS: "au", SRB: "rs", CRO: "hr",
  MAR: "ma", SVK: "sk", POL: "pl", TUN: "tn", CMR: "cm",
  CRC: "cr", SEN: "sn", ECU: "ec", QAT: "qa", GHA: "gh",
  IRN: "ir", ALG: "dz", NGA: "ng", NZL: "nz", DEN: "dk",
  PAR: "py", EGY: "eg", UKR: "ua", PER: "pe", CIV: "ci",
  IDN: "id", TUR: "tr", VEN: "ve", KSA: "sa", PAN: "pa",
  HON: "hn", SUI: "ch", ENG: "gb-eng", SCO: "gb-sct",
  WAL: "gb-wls", NIR: "gb-nir", RUS: "ru", CHN: "cn",
  IND: "in", ZIM: "zw", CIV2: "ci", BOL: "bo", GUA: "gt",
  SLV: "sv", NIC: "ni", CUB: "cu", DOM: "do", JAM: "jm",
  TRI: "tt", HAI: "ht", ISL: "is", NOR: "no", SWE: "se",
  FIN: "fi", AUT: "at", HUN: "hu", CZE: "cz", ROU: "ro",
  BUL: "bg", GRE: "gr", TUR2: "tr", MLT: "mt", CYP: "cy",
  GEO: "ge", ARM: "am", AZE: "az", KAZ: "kz", UZB: "uz",
  IRQ: "iq", SYR: "sy", JOR: "jo", LEB: "lb", OMA: "om",
  UAE: "ae", BHR: "bh", KUW: "kw", YEM: "ye", AFG: "af",
  TKM: "tm", TJK: "tj", KGZ: "kg", NEP: "np", BAN: "bd",
  SRI: "lk", PAK: "pk", MYA: "mm", THA: "th", VIE: "vn",
  MAS: "my", PHI: "ph", SGP: "sg", CAM: "kh", LAO: "la",
  MOZ: "mz", ANG: "ao", ZAM: "zm", ZIM2: "zw", BOT: "bw",
  NAM: "na", RSA: "za", MAD: "mg", TAN: "tz", KEN: "ke",
  ETH: "et", SOM: "so", SUD: "sd", LIB: "ly", TUN2: "tn",
  GAB: "ga", COD: "cd", COG: "cg", CAF: "cf", GEQ: "gq",
  BEN: "bj", TOG: "tg", GHA2: "gh", GUI: "gn", SLE: "sl",
  LBR: "lr", MLI: "ml", BFA: "bf", NIG: "ne", CHA: "td",
  MRT: "mr", GAM: "gm", GNB: "gw", CPV: "cv", STP: "st",
  COM: "km", DJI: "dj", ERI: "er", RWA: "rw", BDI: "bi",
  UGA: "ug", MWI: "mw", ZIM3: "zw", LSO: "ls", SWZ: "sz",
  // Extra common ones
  CHL: "cl", MEX2: "mx",
};

export function getFlagUrl(code: string, size: number = 40): string {
  const iso2 = FIFA_TO_ISO2[code.toUpperCase()];
  if (!iso2) return "";
  return `https://flagcdn.com/w${size}/${iso2}.png`;
}

export function getFlagEmoji(code: string): string {
  const iso2 = FIFA_TO_ISO2[code.toUpperCase()];
  if (!iso2 || iso2.startsWith("gb-")) {
    // GB subdivisions don't have flag emojis via regional indicator
    if (code === "ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    if (code === "SCO") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
    if (code === "WAL") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
    return "🏳️";
  }
  const codePoints = iso2.toUpperCase().split("").map(
    (c) => 0x1f1e0 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}
