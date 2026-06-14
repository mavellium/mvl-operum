-- CreateEnum
CREATE TYPE "WbsLayoutOrientation" AS ENUM ('LADO_A_LADO', 'ABAIXO', 'ABAIXO_L');

-- CreateTable
CREATE TABLE "WbsNode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "layout" "WbsLayoutOrientation" NOT NULL DEFAULT 'ABAIXO',
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "style" JSONB NOT NULL,
    "properties" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbsNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- parentId nullable: PostgreSQL trata NULLs como distintos, logo múltiplos
-- nós raiz (parentId=NULL) de projetos diferentes coexistem. Unicidade por
-- (parentId, order) garante que irmãos não compartilhem a mesma posição.
CREATE UNIQUE INDEX "WbsNode_parentId_order_key" ON "WbsNode"("parentId", "order");

-- CreateIndex
CREATE INDEX "WbsNode_tenantId_idx" ON "WbsNode"("tenantId");

-- CreateIndex
CREATE INDEX "WbsNode_projectId_idx" ON "WbsNode"("projectId");

-- CreateIndex
CREATE INDEX "WbsNode_parentId_idx" ON "WbsNode"("parentId");

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "WbsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
