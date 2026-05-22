-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'purchase',
    "points" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "userId" TEXT,
    "notes" TEXT,
    "redeemedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseCode" ("code", "createdAt", "id", "notes", "points", "redeemedAt", "status", "updatedAt", "userId") SELECT "code", "createdAt", "id", "notes", "points", "redeemedAt", "status", "updatedAt", "userId" FROM "PurchaseCode";
DROP TABLE "PurchaseCode";
ALTER TABLE "new_PurchaseCode" RENAME TO "PurchaseCode";
CREATE UNIQUE INDEX "PurchaseCode_code_key" ON "PurchaseCode"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
