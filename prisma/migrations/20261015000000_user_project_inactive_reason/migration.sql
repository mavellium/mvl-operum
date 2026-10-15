-- Membro da equipe inativado no projeto com motivo (card "Desativar um stakeholder").
-- Inativar usa active = false (perde o acesso, como no desvincular); o motivo é o que
-- mantém o membro visível em Stakeholders e em Partes Interessadas. Só acrescenta
-- colunas anuláveis: vínculos existentes (inclusive os desvinculados) ficam sem motivo.
ALTER TABLE "UserProject" ADD COLUMN "inactiveReason" TEXT;
ALTER TABLE "UserProject" ADD COLUMN "inactivatedAt" TIMESTAMP(3);
