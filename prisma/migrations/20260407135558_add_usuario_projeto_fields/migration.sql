-- AlterTable
ALTER TABLE "UsuarioProjeto" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "valorHora" DOUBLE PRECISION;
