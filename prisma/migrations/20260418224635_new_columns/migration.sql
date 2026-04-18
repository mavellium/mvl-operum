/*
  Warnings:

  - You are about to drop the column `address` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ano" INTEGER,
ADD COLUMN     "departamentos" TEXT[],
ADD COLUMN     "descricaoProduto" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "justificativa" TEXT,
ADD COLUMN     "limitesAutoridade" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "metodologia" TEXT,
ADD COLUMN     "objetivos" TEXT,
ADD COLUMN     "premissas" TEXT,
ADD COLUMN     "restricoes" TEXT,
ADD COLUMN     "semestre" TEXT,
ADD COLUMN     "slogan" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "address",
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT;

-- CreateTable
CREATE TABLE "ProjectMacroFase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "dataLimite" TEXT,
    "custo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMacroFase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "company" TEXT,
    "competence" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStakeholder_projectId_stakeholderId_key" ON "ProjectStakeholder"("projectId", "stakeholderId");

-- AddForeignKey
ALTER TABLE "ProjectMacroFase" ADD CONSTRAINT "ProjectMacroFase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
