import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_POINT_RULES = {
  GROUP_SIGN: { label: "Acertar resultado grupo (ganador/empate)", points: 3 },
  GROUP_DRAW_BONUS: { label: "Bonus acertar empate exacto", points: 1 },
  GROUP_CLASSIFIED: { label: "Acertar clasificado a Ronda de 32", points: 8 },
  GROUP_POSITION: { label: "Acertar posición exacta en grupo", points: 5 },
  ROUND_OF_32: { label: "Acertar equipo que pasa a octavos", points: 10 },
  ROUND_OF_16: { label: "Acertar equipo que pasa a cuartos", points: 15 },
  QUARTER_FINALS: { label: "Acertar equipo que pasa a semis", points: 22 },
  SEMI_FINALS: { label: "Acertar equipo que pasa a final", points: 30 },
  CHAMPION: { label: "Acertar campeón", points: 60 },
  RUNNER_UP: { label: "Acertar subcampeón", points: 30 },
  FINAL_EXACT: { label: "Acertar final completa", points: 40 },
  SPECIAL_CHAMPION: { label: "Campeón predicho antes del torneo", points: 60 },
  SPECIAL_TOP_SCORER: { label: "Goleador del torneo", points: 40 },
  SPECIAL_REVELATION: { label: "Selección revelación", points: 20 },
  SPECIAL_BEST_PLAYER: { label: "Mejor jugador", points: 30 },
};

async function main() {
  console.log("Starting seed...");

  // 1. Create AdminUser
  const adminEmail = process.env.ADMIN_EMAIL || "admin@prode2026.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // 2. Create PointRules
  for (const [key, rule] of Object.entries(DEFAULT_POINT_RULES)) {
    await prisma.pointRule.upsert({
      where: { key },
      update: { label: rule.label, points: rule.points },
      create: { key, label: rule.label, points: rule.points },
    });
  }
  console.log("Point rules created.");

  // 3. Create 12 WorldCupGroups
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const groupMap: Record<string, string> = {};

  for (const name of groupNames) {
    const group = await prisma.worldCupGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    groupMap[name] = group.id;
  }
  console.log("Groups created.");

  // Maps FIFA code → ISO alpha-2 for flagcdn.com
  const flagUrl = (iso2: string) => `https://flagcdn.com/w40/${iso2}.png`;

  // 4. Create 48 teams (4 per group) con nombres en español y banderas
  const teamsData = [
    // Grupo A — sedes anfitrionas
    { name: "Estados Unidos",  code: "USA", group: "A", flag: flagUrl("us") },
    { name: "México",          code: "MEX", group: "A", flag: flagUrl("mx") },
    { name: "Canadá",          code: "CAN", group: "A", flag: flagUrl("ca") },
    { name: "Honduras",        code: "HON", group: "A", flag: flagUrl("hn") },
    // Grupo B
    { name: "Brasil",          code: "BRA", group: "B", flag: flagUrl("br") },
    { name: "Serbia",          code: "SRB", group: "B", flag: flagUrl("rs") },
    { name: "Suiza",           code: "SUI", group: "B", flag: flagUrl("ch") },
    { name: "Camerún",         code: "CMR", group: "B", flag: flagUrl("cm") },
    // Grupo C
    { name: "Argentina",       code: "ARG", group: "C", flag: flagUrl("ar") },
    { name: "Croacia",         code: "CRO", group: "C", flag: flagUrl("hr") },
    { name: "Marruecos",       code: "MAR", group: "C", flag: flagUrl("ma") },
    { name: "Eslovaquia",      code: "SVK", group: "C", flag: flagUrl("sk") },
    // Grupo D
    { name: "Francia",         code: "FRA", group: "D", flag: flagUrl("fr") },
    { name: "Polonia",         code: "POL", group: "D", flag: flagUrl("pl") },
    { name: "Australia",       code: "AUS", group: "D", flag: flagUrl("au") },
    { name: "Túnez",           code: "TUN", group: "D", flag: flagUrl("tn") },
    // Grupo E
    { name: "España",          code: "ESP", group: "E", flag: flagUrl("es") },
    { name: "Japón",           code: "JPN", group: "E", flag: flagUrl("jp") },
    { name: "Costa Rica",      code: "CRC", group: "E", flag: flagUrl("cr") },
    { name: "Senegal",         code: "SEN", group: "E", flag: flagUrl("sn") },
    // Grupo F
    { name: "Alemania",        code: "GER", group: "F", flag: flagUrl("de") },
    { name: "Portugal",        code: "POR", group: "F", flag: flagUrl("pt") },
    { name: "Colombia",        code: "COL", group: "F", flag: flagUrl("co") },
    { name: "Corea del Sur",   code: "KOR", group: "F", flag: flagUrl("kr") },
    // Grupo G
    { name: "Países Bajos",    code: "NED", group: "G", flag: flagUrl("nl") },
    { name: "Ecuador",         code: "ECU", group: "G", flag: flagUrl("ec") },
    { name: "Catar",           code: "QAT", group: "G", flag: flagUrl("qa") },
    { name: "Ghana",           code: "GHA", group: "G", flag: flagUrl("gh") },
    // Grupo H
    { name: "Inglaterra",      code: "ENG", group: "H", flag: flagUrl("gb-eng") },
    { name: "Irán",            code: "IRN", group: "H", flag: flagUrl("ir") },
    { name: "Uruguay",         code: "URU", group: "H", flag: flagUrl("uy") },
    { name: "Argelia",         code: "ALG", group: "H", flag: flagUrl("dz") },
    // Grupo I
    { name: "Italia",          code: "ITA", group: "I", flag: flagUrl("it") },
    { name: "Chile",           code: "CHI", group: "I", flag: flagUrl("cl") },
    { name: "Nigeria",         code: "NGA", group: "I", flag: flagUrl("ng") },
    { name: "Nueva Zelanda",   code: "NZL", group: "I", flag: flagUrl("nz") },
    // Grupo J
    { name: "Bélgica",         code: "BEL", group: "J", flag: flagUrl("be") },
    { name: "Dinamarca",       code: "DEN", group: "J", flag: flagUrl("dk") },
    { name: "Paraguay",        code: "PAR", group: "J", flag: flagUrl("py") },
    { name: "Egipto",          code: "EGY", group: "J", flag: flagUrl("eg") },
    // Grupo K
    { name: "Ucrania",         code: "UKR", group: "K", flag: flagUrl("ua") },
    { name: "Perú",            code: "PER", group: "K", flag: flagUrl("pe") },
    { name: "Costa de Marfil", code: "CIV", group: "K", flag: flagUrl("ci") },
    { name: "Indonesia",       code: "IDN", group: "K", flag: flagUrl("id") },
    // Grupo L
    { name: "Turquía",         code: "TUR", group: "L", flag: flagUrl("tr") },
    { name: "Venezuela",       code: "VEN", group: "L", flag: flagUrl("ve") },
    { name: "Arabia Saudita",  code: "KSA", group: "L", flag: flagUrl("sa") },
    { name: "Panamá",          code: "PAN", group: "L", flag: flagUrl("pa") },
  ];

  const teamMap: Record<string, string> = {};
  for (const t of teamsData) {
    const team = await prisma.team.upsert({
      where: { code: t.code },
      update: { name: t.name, groupId: groupMap[t.group], flagUrl: t.flag },
      create: {
        name: t.name,
        code: t.code,
        groupId: groupMap[t.group],
        flagUrl: t.flag,
      },
    });
    teamMap[t.code] = team.id;
  }
  console.log("Teams created.");

  // 5. Create sample group stage matches
  const matchesData = [
    // Group A
    { code: "G-A-01", groupName: "A", home: "USA", away: "HON", date: "2026-06-11T18:00:00Z" },
    { code: "G-A-02", groupName: "A", home: "MEX", away: "CAN", date: "2026-06-11T21:00:00Z" },
    { code: "G-A-03", groupName: "A", home: "USA", away: "MEX", date: "2026-06-15T21:00:00Z" },
    { code: "G-A-04", groupName: "A", home: "CAN", away: "HON", date: "2026-06-15T18:00:00Z" },
    { code: "G-A-05", groupName: "A", home: "USA", away: "CAN", date: "2026-06-19T18:00:00Z" },
    { code: "G-A-06", groupName: "A", home: "MEX", away: "HON", date: "2026-06-19T18:00:00Z" },
    // Group B
    { code: "G-B-01", groupName: "B", home: "BRA", away: "CMR", date: "2026-06-12T18:00:00Z" },
    { code: "G-B-02", groupName: "B", home: "SRB", away: "SUI", date: "2026-06-12T21:00:00Z" },
    { code: "G-B-03", groupName: "B", home: "BRA", away: "SRB", date: "2026-06-16T18:00:00Z" },
    { code: "G-B-04", groupName: "B", home: "SUI", away: "CMR", date: "2026-06-16T21:00:00Z" },
    { code: "G-B-05", groupName: "B", home: "BRA", away: "SUI", date: "2026-06-20T18:00:00Z" },
    { code: "G-B-06", groupName: "B", home: "SRB", away: "CMR", date: "2026-06-20T18:00:00Z" },
    // Group C
    { code: "G-C-01", groupName: "C", home: "ARG", away: "SVK", date: "2026-06-13T18:00:00Z" },
    { code: "G-C-02", groupName: "C", home: "CRO", away: "MAR", date: "2026-06-13T21:00:00Z" },
    { code: "G-C-03", groupName: "C", home: "ARG", away: "CRO", date: "2026-06-17T18:00:00Z" },
    { code: "G-C-04", groupName: "C", home: "MAR", away: "SVK", date: "2026-06-17T21:00:00Z" },
    { code: "G-C-05", groupName: "C", home: "ARG", away: "MAR", date: "2026-06-21T18:00:00Z" },
    { code: "G-C-06", groupName: "C", home: "CRO", away: "SVK", date: "2026-06-21T18:00:00Z" },
  ];

  for (const m of matchesData) {
    const homeTeamId = teamMap[m.home];
    const awayTeamId = teamMap[m.away];
    const groupId = groupMap[m.groupName];

    await prisma.match.upsert({
      where: { matchCode: m.code },
      update: {},
      create: {
        matchCode: m.code,
        phase: "GROUP_STAGE",
        groupId,
        homeTeamId,
        awayTeamId,
        startDate: new Date(m.date),
        status: "scheduled",
      },
    });
  }
  console.log("Sample matches created.");

  // 6. Default Settings
  const settings = [
    { key: "event_name", value: "Prode Mundial Gamer 2026" },
    { key: "event_active", value: "true" },
    { key: "predictions_open", value: "true" },
    { key: "show_ranking", value: "true" },
    { key: "whatsapp_number", value: "5491112345678" },
    {
      key: "whatsapp_purchase_message",
      value:
        "Hola The Gamer Shop! Compré en el local y quiero mi código para sumar puntos en el Prode Mundial 2026. Mi email de registro es: ",
    },
    {
      key: "whatsapp_venue_message",
      value:
        "Hola The Gamer Shop! Estoy en el local viendo el partido y quiero info sobre el código exclusivo del Prode. Mi email es: ",
    },
    { key: "instagram_url", value: "https://www.instagram.com/thegamershop/" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log("Settings created.");

  // 7. Sponsors
  const sponsor = await prisma.sponsor.upsert({
    where: { id: "sponsor-main" },
    update: {},
    create: {
      id: "sponsor-main",
      name: "Sponsor Principal",
      description: "El patrocinador principal del Prode Mundial 2026",
      active: true,
    },
  });

  await prisma.sponsor.upsert({
    where: { id: "sponsor-jbl-quantum" },
    update: {
      name: "JBL Quantum",
      logoUrl: "/uploads/sponsors/jbl-quantum.png",
      active: true,
    },
    create: {
      id: "sponsor-jbl-quantum",
      name: "JBL Quantum",
      logoUrl: "/uploads/sponsors/jbl-quantum.png",
      active: true,
    },
  });

  // Sample Prizes
  await prisma.prize.upsert({
    where: { id: "prize-001" },
    update: {},
    create: {
      id: "prize-001",
      name: "Camiseta Selección Argentina",
      description: "Camiseta oficial de la Selección Argentina firmada",
      requiredPoints: 500,
      stock: 5,
      sponsorId: sponsor.id,
      active: true,
    },
  });

  await prisma.prize.upsert({
    where: { id: "prize-002" },
    update: {},
    create: {
      id: "prize-002",
      name: "Gift Card $5000",
      description: "Gift card para gastar en nuestros sponsors",
      requiredPoints: 300,
      stock: 10,
      sponsorId: sponsor.id,
      active: true,
    },
  });

  console.log("Prizes created.");

  // Sample BonusActions
  await prisma.bonusAction.upsert({
    where: { id: "bonus-001" },
    update: {},
    create: {
      id: "bonus-001",
      name: "Seguir en Instagram",
      description: "Seguí nuestra cuenta de Instagram @prode2026",
      points: 50,
      sponsorId: sponsor.id,
      requiresApproval: true,
      active: true,
    },
  });

  await prisma.bonusAction.upsert({
    where: { id: "bonus-002" },
    update: {},
    create: {
      id: "bonus-002",
      name: "Compartir en Stories",
      description: "Compartí tu predicción en tus stories con el hashtag #Prode2026",
      points: 30,
      sponsorId: sponsor.id,
      requiresApproval: true,
      active: true,
    },
  });

  await prisma.bonusAction.upsert({
    where: { id: "bonus-003" },
    update: {},
    create: {
      id: "bonus-003",
      name: "Invitar un amigo",
      description: "Invitá a un amigo a participar del prode",
      points: 100,
      requiresApproval: true,
      active: true,
    },
  });

  console.log("Bonus actions created.");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
