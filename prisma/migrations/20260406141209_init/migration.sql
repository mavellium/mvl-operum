/*
  Warnings:

  - You are about to drop the column `columnId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `responsible` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `responsibleId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `boardId` on the `Sprint` table. All the data in the column will be lost.
  - You are about to drop the column `boardId` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the `Board` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Column` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,userId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `sprintId` on table `Card` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "ProjetoStatus" AS ENUM ('ATIVO', 'INATIVO', 'CONCLUIDO', 'ARQUIVADO');

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_columnId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_responsibleId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_sprintId_fkey";

-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Sprint" DROP CONSTRAINT "Sprint_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_boardId_fkey";

-- DropIndex
DROP INDEX "Tag_name_userId_boardId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "columnId",
DROP COLUMN "responsible",
DROP COLUMN "responsibleId",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'media',
ALTER COLUMN "position" SET DEFAULT 0,
ALTER COLUMN "sprintId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sprint" DROP COLUMN "boardId",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "projetoId" TEXT;

-- AlterTable
ALTER TABLE "SprintColumn" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "boardId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ativo',
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Board";

-- DropTable
DROP TABLE "Column";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "subdominio" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ATIVO',
    "config" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "ProjetoStatus" NOT NULL DEFAULT 'ATIVO',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "valorHora" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioDepartamento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,

    CONSTRAINT "UsuarioDepartamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioProjeto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSaida" TIMESTAMP(3),

    CONSTRAINT "UsuarioProjeto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdominio_key" ON "Tenant"("subdominio");

-- CreateIndex
CREATE UNIQUE INDEX "Projeto_nome_tenantId_key" ON "Projeto"("nome", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nome_tenantId_key" ON "Departamento"("nome", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioDepartamento_userId_departamentoId_key" ON "UsuarioDepartamento"("userId", "departamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioProjeto_userId_projetoId_key" ON "UsuarioProjeto"("userId", "projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_userId_key" ON "Tag"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioDepartamento" ADD CONSTRAINT "UsuarioDepartamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioDepartamento" ADD CONSTRAINT "UsuarioDepartamento_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioProjeto" ADD CONSTRAINT "UsuarioProjeto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioProjeto" ADD CONSTRAINT "UsuarioProjeto_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
