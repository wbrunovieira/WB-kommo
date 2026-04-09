-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'SELECT');

-- CreateTable
CREATE TABLE "lead_field_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_field_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_field_configs_tenantId_idx" ON "lead_field_configs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_field_configs_tenantId_key_key" ON "lead_field_configs"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "lead_field_configs" ADD CONSTRAINT "lead_field_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
