-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamExternalId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamLogo" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalsDiff" INTEGER NOT NULL DEFAULT 0,
    "form" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TopScorer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "teamName" TEXT,
    "teamLogo" TEXT,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER,
    "extraTime" INTEGER,
    "teamId" TEXT,
    "teamName" TEXT,
    "playerName" TEXT,
    "assistName" TEXT,
    "eventType" TEXT NOT NULL,
    "detail" TEXT,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Standing_season_group_teamExternalId_key" ON "Standing"("season", "group", "teamExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "TopScorer_season_externalId_key" ON "TopScorer"("season", "externalId");
