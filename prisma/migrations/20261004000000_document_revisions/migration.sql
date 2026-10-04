ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'EAP';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'ATA';
ALTER TABLE "DocumentVersion" ADD COLUMN "payload" JSONB, ADD COLUMN "resourceId" TEXT NOT NULL DEFAULT '', ADD COLUMN "sequence" SERIAL NOT NULL;
CREATE UNIQUE INDEX "DocumentVersion_sequence_key" ON "DocumentVersion" ("sequence");
CREATE INDEX "DocumentVersion_current_idx" ON "DocumentVersion" ("projectId", "documentType", "resourceId", "status", "approvedAt");
CREATE TABLE "DocumentDraft" (
  "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "documentType" "DocumentType" NOT NULL, "resourceId" TEXT NOT NULL DEFAULT '',
  "payload" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DocumentDraft_projectId_userId_documentType_resourceId_key" ON "DocumentDraft" ("projectId", "userId", "documentType", "resourceId");
CREATE INDEX "DocumentDraft_tenantId_projectId_idx" ON "DocumentDraft" ("tenantId", "projectId");
