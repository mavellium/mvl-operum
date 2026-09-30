-- SDD 5.1 — Permissões por função e por usuário.
-- Funções (Role) ganham permissões configuráveis pelo admin (RolePermission,
-- tabela que já existia sem uso). Usuários ganham ajustes GRANT/DENY, globais
-- (projectId nulo) ou por projeto. Enquanto o admin não salvar a matriz de uma
-- função (permissoesDefinidasEm nulo), valem os padrões de lib/permissoes.ts,
-- que reproduzem o comportamento anterior.

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('GRANT', 'DENY');

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "permissoesDefinidasEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "permissionId" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_projectId_permissionId_key" ON "UserPermission"("userId", "projectId", "permissionId");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ajuste global: um por (usuário, permissão). O @@unique do Prisma inclui
-- projectId, e o Postgres não trata NULL como igual.
CREATE UNIQUE INDEX "UserPermission_global_key" ON "UserPermission"("userId", "permissionId") WHERE "projectId" IS NULL;

-- Catálogo (idempotente). O código identifica a permissão por resource:action,
-- não pelo nome, para conviver com linhas que já existam na tabela.
INSERT INTO "Permission" ("id", "name", "description", "resource", "action", "createdAt", "updatedAt") VALUES
  ('perm_projeto_ver', 'projeto:ver', 'Ver o projeto', 'projeto', 'ver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_projeto_editar', 'projeto:editar', 'Editar dados do projeto e macrofases', 'projeto', 'editar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_projeto_equipe', 'projeto:equipe', 'Gerenciar membros e stakeholders', 'projeto', 'equipe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_quadro_ver', 'quadro:ver', 'Ver sprints e cards', 'quadro', 'ver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_quadro_cards', 'quadro:cards', 'Criar e editar cards', 'quadro', 'cards', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_quadro_mover', 'quadro:mover', 'Mover cards', 'quadro', 'mover', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_quadro_excluir', 'quadro:excluir', 'Excluir cards', 'quadro', 'excluir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_quadro_sprints', 'quadro:sprints', 'Gerenciar sprints e colunas', 'quadro', 'sprints', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_documentos_ver', 'documentos:ver', 'Ver documentos', 'documentos', 'ver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_documentos_editar', 'documentos:editar', 'Editar documentos (gera versão pendente)', 'documentos', 'editar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_documentos_aprovar', 'documentos:aprovar', 'Aprovar ou rejeitar versões', 'documentos', 'aprovar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_documentos_excluir', 'documentos:excluir', 'Excluir documentos', 'documentos', 'excluir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_planilha_ver', 'planilha:ver', 'Ver a planilha', 'planilha', 'ver', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_planilha_orcado', 'planilha:orcado', 'Editar o orçado', 'planilha', 'orcado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_planilha_realizado_proprio', 'planilha:realizado-proprio', 'Editar o realizado das próprias linhas', 'planilha', 'realizado-proprio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_planilha_realizado_todos', 'planilha:realizado-todos', 'Editar o realizado de todas as linhas', 'planilha', 'realizado-todos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_cadastros_gerenciar', 'cadastros:gerenciar', 'Gerenciar funções e departamentos do projeto', 'cadastros', 'gerenciar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
