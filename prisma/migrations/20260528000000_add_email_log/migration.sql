-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ctaUrl" TEXT,
    "ctaLabel" TEXT,
    "recipientCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");
