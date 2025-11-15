-- CreateEnum
CREATE TYPE "QrSessionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CONSUMED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "qr_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "QrSessionStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "deviceSessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_sessions_code_status_idx" ON "qr_sessions"("code", "status");

-- CreateIndex
CREATE INDEX "qr_sessions_expiresAt_idx" ON "qr_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "qr_sessions" ADD CONSTRAINT "qr_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
