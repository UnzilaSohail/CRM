-- Customer lifecycle and attributes, credentials on User, acknowledgement fields on Alert.
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'ARCHIVED');

ALTER TABLE "Customer"
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "ownerId" UUID;

CREATE INDEX "Customer_tenantId_status_idx" ON "Customer"("tenantId", "status");

ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mfaSecret" TEXT;

ALTER TABLE "Alert"
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "acknowledgedBy" UUID,
  ADD COLUMN "cause" TEXT;
