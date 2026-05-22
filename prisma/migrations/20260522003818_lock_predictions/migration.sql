-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BracketPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "matchSlot" TEXT NOT NULL,
    "predictedTeamId" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BracketPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BracketPrediction_predictedTeamId_fkey" FOREIGN KEY ("predictedTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BracketPrediction" ("createdAt", "id", "matchSlot", "phase", "pointsEarned", "predictedTeamId", "updatedAt", "userId") SELECT "createdAt", "id", "matchSlot", "phase", "pointsEarned", "predictedTeamId", "updatedAt", "userId" FROM "BracketPrediction";
DROP TABLE "BracketPrediction";
ALTER TABLE "new_BracketPrediction" RENAME TO "BracketPrediction";
CREATE UNIQUE INDEX "BracketPrediction_userId_phase_matchSlot_key" ON "BracketPrediction"("userId", "phase", "matchSlot");
CREATE TABLE "new_GroupPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "firstTeamId" TEXT,
    "secondTeamId" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupPrediction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WorldCupGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupPrediction_firstTeamId_fkey" FOREIGN KEY ("firstTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GroupPrediction_secondTeamId_fkey" FOREIGN KEY ("secondTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GroupPrediction" ("createdAt", "firstTeamId", "groupId", "id", "pointsEarned", "secondTeamId", "updatedAt", "userId") SELECT "createdAt", "firstTeamId", "groupId", "id", "pointsEarned", "secondTeamId", "updatedAt", "userId" FROM "GroupPrediction";
DROP TABLE "GroupPrediction";
ALTER TABLE "new_GroupPrediction" RENAME TO "GroupPrediction";
CREATE UNIQUE INDEX "GroupPrediction_userId_groupId_key" ON "GroupPrediction"("userId", "groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
