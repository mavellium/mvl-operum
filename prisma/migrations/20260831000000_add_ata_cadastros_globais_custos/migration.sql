-- Reconciliação de drift pré-existente: coluna `status` órfã em Card (não mais usada pela aplicação) e default de layout em WbsNode.
ALTER TABLE "Card" DROP COLUMN "status";
ALTER TABLE "WbsNode" ALTER COLUMN "layout" SET DEFAULT 'LADO_A_LADO';

-- Feature 5: Planilha de Custos — parâmetros de federação tempo→custo no projeto.
ALTER TABLE "Project" ADD COLUMN     "horasPorDia" DOUBLE PRECISION,
ADD COLUMN     "valorReferencia" DOUBLE PRECISION;

-- Feature 1: Cadastros globais — associação de departamento do catálogo do tenant a um projeto.
CREATE TABLE "ProjetoDepartamento" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjetoDepartamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjetoDepartamento_departamentoId_idx" ON "ProjetoDepartamento"("departamentoId");

CREATE UNIQUE INDEX "ProjetoDepartamento_projetoId_departamentoId_key" ON "ProjetoDepartamento"("projetoId", "departamentoId");

ALTER TABLE "ProjetoDepartamento" ADD CONSTRAINT "ProjetoDepartamento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjetoDepartamento" ADD CONSTRAINT "ProjetoDepartamento_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Feature 4: Atas de reunião (múltiplas por projeto).
CREATE TABLE "Ata" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nomeProjeto" TEXT NOT NULL,
    "local" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "elaboradoPor" TEXT NOT NULL,
    "aprovadoPor" TEXT,
    "assuntosTratados" TEXT,
    "decisoesTomadas" TEXT,
    "observacoes" TEXT,
    "copiasPara" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ata_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ata_tenantId_idx" ON "Ata"("tenantId");

CREATE INDEX "Ata_projetoId_idx" ON "Ata"("projetoId");

CREATE UNIQUE INDEX "Ata_projetoId_numero_key" ON "Ata"("projetoId", "numero");

ALTER TABLE "Ata" ADD CONSTRAINT "Ata_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AtaPresente" (
    "id" TEXT NOT NULL,
    "ataId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "setorEmpresa" TEXT,

    CONSTRAINT "AtaPresente_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AtaPresente" ADD CONSTRAINT "AtaPresente_ataId_fkey" FOREIGN KEY ("ataId") REFERENCES "Ata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AtaAcao" (
    "id" TEXT NOT NULL,
    "ataId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "prazo" TIMESTAMP(3),
    "responsavel" TEXT,

    CONSTRAINT "AtaAcao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AtaAcao" ADD CONSTRAINT "AtaAcao_ataId_fkey" FOREIGN KEY ("ataId") REFERENCES "Ata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AtaAnexo" (
    "id" TEXT NOT NULL,
    "ataId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "AtaAnexo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AtaAnexo" ADD CONSTRAINT "AtaAnexo_ataId_fkey" FOREIGN KEY ("ataId") REFERENCES "Ata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
