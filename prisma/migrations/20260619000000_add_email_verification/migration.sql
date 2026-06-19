-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3),
  ADD COLUMN "referralBonusAwarded" BOOLEAN NOT NULL DEFAULT false;

-- Existing referred users have already been credited under the old flow.
UPDATE "User" SET "referralBonusAwarded" = true WHERE "referredById" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
