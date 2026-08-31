-- Feature 1: associação de funções (Role globais do tenant) a um projeto
CREATE TABLE "ProjetoFuncao" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "funcaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetoFuncao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjetoFuncao_funcaoId_idx" ON "ProjetoFuncao"("funcaoId");
CREATE UNIQUE INDEX "ProjetoFuncao_projetoId_funcaoId_key" ON "ProjetoFuncao"("projetoId", "funcaoId");
ALTER TABLE "ProjetoFuncao" ADD CONSTRAINT "ProjetoFuncao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjetoFuncao" ADD CONSTRAINT "ProjetoFuncao_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
