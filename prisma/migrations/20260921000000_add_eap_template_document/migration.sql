-- AddEapTemplateDocument

-- CreateTable
CREATE TABLE "EapTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "EapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EapDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "projectManager" TEXT NOT NULL DEFAULT '',
    "preparedBy" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL DEFAULT '',
    "approvalDate" TEXT,
    "nodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EapDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EapDocument_projectId_key" ON "EapDocument"("projectId");

-- CreateIndex
CREATE INDEX "EapTemplate_tenantId_idx" ON "EapTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "EapDocument_tenantId_idx" ON "EapDocument"("tenantId");

-- AddForeignKey
ALTER TABLE "EapTemplate" ADD CONSTRAINT "EapTemplate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EapDocument" ADD CONSTRAINT "EapDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EapDocument" ADD CONSTRAINT "EapDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EapDocument" ADD CONSTRAINT "EapDocument_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "EapTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;